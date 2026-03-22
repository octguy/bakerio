package main

import (
	"context"

	"github.com/gin-gonic/gin"
	"github.com/octguy/bakerio/backend/internal/auth"
	"github.com/octguy/bakerio/backend/internal/platform/database"
	"github.com/octguy/bakerio/backend/internal/platform/logger"
	"github.com/octguy/bakerio/backend/internal/profile"
	"github.com/octguy/bakerio/backend/pkg/config"
	"github.com/octguy/bakerio/backend/pkg/txmanager"
	"go.uber.org/zap"
)

func main() {
	// 1. Load all environment variables
	cfg := config.Load()

	// 2. Init logger
	err := logger.Init(cfg.Server.Env)
	if err != nil {
		return
	}
	defer logger.Sync()

	// 3. Create database connection pool
	pool, err := database.Connect(context.Background(), cfg.DSN())
	if err != nil {
		logger.Log.Fatal("failed to connect to database", zap.Error(err))
	}
	defer pool.Close()

	// 4. Init transactional factory
	tx := txmanager.New(pool)

	// 5. Wire
	profileModule := profile.NewModule(pool, tx)
	authModule := auth.NewModule(pool, tx, profileModule.Service())

	// 6. Init gin engine
	r := gin.Default()

	// 7. Register routes to the engine
	v1 := r.Group("/api/v1")
	authModule.RegisterRoutes(v1)

	// 8. Start server
	if err := r.Run(":" + cfg.Server.Port); err != nil {
		logger.Log.Fatal("Server start failed", zap.Error(err))
	}
}
