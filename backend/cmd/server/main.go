package main

import (
	"context"

	"github.com/gin-gonic/gin"
	"github.com/octguy/bakerio/backend/internal/auth"
	"github.com/octguy/bakerio/backend/internal/platform/database"
	"github.com/octguy/bakerio/backend/internal/platform/logger"
	"github.com/octguy/bakerio/backend/pkg/config"
	"github.com/octguy/bakerio/backend/pkg/txmanager"
	"go.uber.org/zap"
)

func main() {
	cfg := config.Load()
	logger.Init(cfg.Server.Env)
	defer logger.Sync()

	pool, err := database.Connect(context.Background(), cfg.DSN())
	if err != nil {
		logger.Log.Fatal("failed to connect to database", zap.Error(err))
	}
	defer pool.Close()

	tx := txmanager.New(pool)

	// Modules
	authModule := auth.NewModule(pool, tx)

	r := gin.Default()

	v1 := r.Group("/api/v1")
	authModule.RegisterRoutes(v1)

	logger.Log.Info("Server started successfully")
	if err := r.Run(":" + cfg.Server.Port); err != nil {
		logger.Log.Fatal("Server start failed", zap.Error(err))
	}
}
