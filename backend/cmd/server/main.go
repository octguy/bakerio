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
	"os/signal"
	"strings"
	"syscall"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/octguy/bakerio/backend/internal/auth"
	"github.com/octguy/bakerio/backend/internal/branch"
	"github.com/octguy/bakerio/backend/internal/notification"
	"github.com/octguy/bakerio/backend/internal/platform/cache"
	"github.com/octguy/bakerio/backend/internal/platform/database"
	"github.com/octguy/bakerio/backend/internal/platform/email"
	"github.com/octguy/bakerio/backend/internal/platform/logger"
	"github.com/octguy/bakerio/backend/internal/platform/middleware"
	"github.com/octguy/bakerio/backend/internal/platform/mq"
	"github.com/octguy/bakerio/backend/internal/platform/otp"
	"github.com/octguy/bakerio/backend/internal/platform/outbox"
	"github.com/octguy/bakerio/backend/internal/platform/storage"
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
	defer func(redisClient *cache.Client) {
		err := redisClient.Close()
		if err != nil {
			logger.Log.Fatal("redis close failed", zap.Error(err))
		}
	}(redisClient)

	// 4.3. RabbitMQ
	rmq, err := mq.NewRabbitMQ(cfg.MQ.URL, logger.Log)
	if err != nil {
		logger.Log.Fatal("rabbitmq connect failed", zap.Error(err))
	}
	defer func(rmq *mq.RabbitMQ) {
		err := rmq.Close()
		if err != nil {
			logger.Log.Fatal("rabbitmq close failed", zap.Error(err))
		}
	}(rmq)

	ch, err := rmq.Channel()
	if err != nil {
		logger.Log.Fatal("rabbitmq: open channel failed", zap.Error(err))
	}
	if err := mq.SetupTopology(ch); err != nil {
		logger.Log.Fatal("rabbitmq: setup topology failed", zap.Error(err))
	}
	err = ch.Close()
	if err != nil {
		logger.Log.Fatal("rabbitmq: close channel failed", zap.Error(err))
		return
	}

	// 4.4. Object storage (MinIO). The client is lazy — it doesn't connect
	// here, and the bucket is ensured on first image upload — so the app boots
	// fine without MinIO running. Start it with `make docker-minio` when testing
	// product images.
	objectStore, err := storage.New(cfg.Storage)
	if err != nil {
		logger.Log.Fatal("storage init failed", zap.Error(err))
	}

	// 5. Services
	tx := txmanager.New(pool)
	publisher := mq.NewPublisher(rmq)
	consumer := mq.NewConsumer(rmq, logger.Log)
	authOutbox := outbox.NewRepository(pool, "auth.outbox")
	otpService := otp.NewService(redisClient)

	// 6. Modules
	userModule := user.New(pool, tx)
	branchModule := branch.New(pool, tx)
	productModule := product.New(pool, tx, objectStore)
	notifModule := notification.New(email.NewMailService(cfg.Email, cfg.Server), otpService)
	authModule := auth.NewModule(pool, redisClient, tx, userModule.ProfileService(), authOutbox, otpService, cfg.JWT.SecretKey, cfg.JWT.Expiry)
	userModule.Wire(authModule.Service(), authModule.RBACService, branchModule.MembershipService(), branchModule.BranchService())
	branchModule.WireDirectory(userModule.UserDirectory())

	// Product <-> branch fan-out wiring (eager opt-in availability):
	//   product reads the branch list when creating a product;
	//   branch asks product to seed rows when a branch is created.
	productModule.Wire(branchModule.BranchService(), branchModule.MembershipService())
	branchModule.BranchService().SetProductSeeder(productModule.Service())

	if err := authModule.RBACService.WarmPermissionCache(ctx); err != nil {
		logger.Log.Fatal("rbac: failed to warm permission cache", zap.Error(err))
	}

	seedAdmins(ctx, authModule.Service())

	// 7. Background workers
	go outbox.NewWorker(publisher, logger.Log, authOutbox).Run(ctx)

	if err := notifModule.RegisterConsumers(ctx, consumer); err != nil {
		logger.Log.Fatal("notification consumers failed", zap.Error(err))
	}

	// 8. HTTP server
	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOriginFunc: func(origin string) bool {
			return strings.HasPrefix(origin, "http://localhost:")
		},
		AllowMethods:     []string{"GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	v1 := r.Group("/api/v1")

	// Public group
	public := v1.Group("/")

	// Protected group: JWTAuth + LoadPermissions applied once for all guarded routes
	authed := v1.Group("/",
		middleware.JWTAuth(authModule.Service()),
		middleware.LoadPermissions(authModule.RBACService),
	)

	authModule.RegisterRoutes(public, authed)
	userModule.RegisterRoutes(authed)
	branchModule.RegisterRoutes(public, authed)
	productModule.RegisterRoutes(public, authed)

	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	// 9. Start server
	logger.Log.Info("starting http server", zap.String("port", cfg.Server.Port))
	if err := r.Run(":" + cfg.Server.Port); err != nil {
		logger.Log.Fatal("server failed", zap.Error(err))
	}
}
