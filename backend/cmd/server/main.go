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
	"syscall"

	"github.com/gin-gonic/gin"
	"github.com/octguy/bakerio/backend/internal/auth"
	"github.com/octguy/bakerio/backend/internal/notification"
	"github.com/octguy/bakerio/backend/internal/platform/cache"
	"github.com/octguy/bakerio/backend/internal/platform/database"
	"github.com/octguy/bakerio/backend/internal/platform/email"
	"github.com/octguy/bakerio/backend/internal/platform/logger"
	"github.com/octguy/bakerio/backend/internal/platform/mq"
	"github.com/octguy/bakerio/backend/internal/platform/otp"
	"github.com/octguy/bakerio/backend/internal/platform/outbox"
	"github.com/octguy/bakerio/backend/internal/profile"
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

	// 5. Services
	tx := txmanager.New(pool)
	publisher := mq.NewPublisher(rmq)
	consumer := mq.NewConsumer(rmq, logger.Log)
	authOutbox := outbox.NewRepository(pool, "auth.outbox")
	otpService := otp.NewService(redisClient)

	// 6. Modules
	profileModule := profile.NewModule(pool, tx)
	notifModule := notification.New(email.NewMailService(cfg.Email, cfg.Server), otpService)
	authModule := auth.NewModule(pool, redisClient, tx, profileModule.Service(), authOutbox, otpService, cfg.JWT.SecretKey, cfg.JWT.Expiry)

	if err := authModule.RBACService.WarmPermissionCache(ctx); err != nil {
		logger.Log.Fatal("rbac: failed to warm permission cache", zap.Error(err))
	}

	// 7. Background workers (new goroutine)
	go outbox.NewWorker(publisher, logger.Log, authOutbox).Run(ctx)

	if err := notifModule.RegisterConsumers(ctx, consumer); err != nil {
		logger.Log.Fatal("notification consumers failed", zap.Error(err))
	}

	// 8. HTTP server
	r := gin.Default()
	v1 := r.Group("/api/v1")
	authModule.RegisterRoutes(v1)
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	// 9. Start server
	logger.Log.Info("starting http server", zap.String("port", cfg.Server.Port))
	if err := r.Run(":" + cfg.Server.Port); err != nil {
		logger.Log.Fatal("server failed", zap.Error(err))
	}
}
