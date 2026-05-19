// @title           Bakerio API
// @version         1.0
// @description     Bakerio bakery marketplace backend API.

// @host      localhost:8080
// @BasePath  /api/v1

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Type "Bearer" followed by a space and the access token.

package main

import (
	"context"
	"net/http"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/octguy/bakerio/backend/internal/auth"
	"github.com/octguy/bakerio/backend/internal/branch"
	"github.com/octguy/bakerio/backend/internal/notification"
	"github.com/octguy/bakerio/backend/internal/platform/cache"
	"github.com/octguy/bakerio/backend/internal/platform/database"
	"github.com/octguy/bakerio/backend/internal/platform/email"
	"github.com/octguy/bakerio/backend/internal/platform/logger"
	"github.com/octguy/bakerio/backend/internal/platform/mediastore"
	"github.com/octguy/bakerio/backend/internal/platform/middleware"
	"github.com/octguy/bakerio/backend/internal/platform/mq"
	"github.com/octguy/bakerio/backend/internal/platform/otp"
	"github.com/octguy/bakerio/backend/internal/platform/outbox"
	"github.com/octguy/bakerio/backend/internal/procurement"
	"github.com/octguy/bakerio/backend/internal/product"
	"github.com/octguy/bakerio/backend/internal/user"
	"github.com/octguy/bakerio/backend/pkg/config"
	"github.com/octguy/bakerio/backend/pkg/txmanager"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
	"go.uber.org/zap"

	_ "github.com/octguy/bakerio/backend/docs"
)

func main() {
	// 1. Config
	cfg := config.Load()

	// 2. Logger
	if err := logger.Init(cfg.Server.Env); err != nil {
		return
	}
	defer logger.Sync()

	// 3. Context — cancelled on SIGINT/SIGTERM for graceful shutdown
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	// 4. Infrastructure
	// 4.1. Postgres
	pool, err := database.Connect(ctx, cfg.DSN())
	if err != nil {
		logger.Log.Fatal("database connect failed", zap.Error(err))
	}
	defer pool.Close()

	// 4.2. Redis
	redisClient, err := cache.NewClient(cfg.Redis)
	if err != nil {
		logger.Log.Fatal("redis connect failed", zap.Error(err))
	}
	defer redisClient.Close()

	// 4.3. RabbitMQ
	rmq, err := mq.NewRabbitMQ(cfg.MQ.URL, logger.Log)
	if err != nil {
		logger.Log.Fatal("rabbitmq connect failed", zap.Error(err))
	}
	defer rmq.Close()

	ch, err := rmq.Channel()
	if err != nil {
		logger.Log.Fatal("rabbitmq: open channel failed", zap.Error(err))
	}
	if err := mq.SetupTopology(ch); err != nil {
		logger.Log.Fatal("rabbitmq: setup topology failed", zap.Error(err))
	}
	ch.Close()

	// 4.4. Media Storage
	mediaStore, err := mediastore.NewLocalMediaStore(cfg.Uploads.Dir, cfg.Uploads.BaseURL)
	if err != nil {
		logger.Log.Fatal("mediastore init failed", zap.Error(err))
	}

	// 5. Services
	tx := txmanager.New(pool)
	publisher := mq.NewPublisher(rmq)
	consumer := mq.NewConsumer(rmq, logger.Log)
	authOutbox := outbox.NewRepository(pool, "auth.outbox")
	procurementOutbox := outbox.NewRepository(pool, "procurement.outbox")
	otpService := otp.NewService(redisClient)

	// 6. Modules
	userModule := user.New(pool, tx)
	branchModule := branch.New(pool, tx)
	productModule := product.New(pool, tx, mediaStore, cfg.Uploads.MaxSize)
	notifModule := notification.New(email.NewMailService(cfg.Email, cfg.Server), otpService)
	authModule := auth.NewModule(pool, redisClient, tx, userModule.ProfileService(), branchModule.Service(), authOutbox, otpService, cfg.JWT.SecretKey, cfg.JWT.Expiry)
	procurementModule := procurement.NewModule(pool, tx)
	userModule.Wire(authModule.Service())

	if err := authModule.RBACService.WarmPermissionCache(ctx); err != nil {
		logger.Log.Fatal("rbac: failed to warm permission cache", zap.Error(err))
	}

	seedAdmins(ctx, authModule.Service(), branchModule.Service())

	// 7. Background workers
	go outbox.NewWorker(publisher, logger.Log, authOutbox, procurementOutbox).Run(ctx)

	if err := notifModule.RegisterConsumers(ctx, consumer); err != nil {
		logger.Log.Fatal("notification consumers failed", zap.Error(err))
	}

	// 8. HTTP server
	r := gin.Default()

	// Global middleware
	r.Use(middleware.SecurityHeaders())
	r.Use(middleware.CORS(cfg.Server.CORSOrigins))
	r.Use(middleware.RequestID())

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// Register static route for uploads
	r.Static("/uploads", cfg.Uploads.Dir)

	v1 := r.Group("/api/v1")

	// Public group
	public := v1.Group("/")

	// Protected group: JWTAuth + LoadPermissions applied once for all guarded routes
	authed := v1.Group("/",
		middleware.JWTAuth(authModule.Service()),
		middleware.LoadPermissions(authModule.RBACService),
	)

	// Rate limiters for auth endpoints
	loginRL := middleware.RateLimit(redisClient, 5, time.Minute)
	registerRL := middleware.RateLimit(redisClient, 3, time.Minute)

	authModule.RegisterRoutes(public, authed, loginRL, registerRL)
	userModule.RegisterRoutes(authed)
	branchModule.RegisterRoutes(authed)
	productModule.RegisterRoutes(authed)
	procurementModule.RegisterRoutes(authed)

	// Swagger: only in non-production
	if cfg.Server.Env != "production" {
		r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
	}

	// 9. Start server with graceful shutdown
	srv := &http.Server{
		Addr:         ":" + cfg.Server.Port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		logger.Log.Info("starting http server", zap.String("port", cfg.Server.Port))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Log.Fatal("server failed", zap.Error(err))
		}
	}()

	<-ctx.Done()
	logger.Log.Info("shutting down server...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Log.Error("server shutdown failed", zap.Error(err))
	}
}
