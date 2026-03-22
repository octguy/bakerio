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

	"github.com/gin-gonic/gin"
	"github.com/octguy/bakerio/backend/internal/auth"
	"github.com/octguy/bakerio/backend/internal/platform/database"
	"github.com/octguy/bakerio/backend/internal/platform/logger"
	"github.com/octguy/bakerio/backend/internal/profile"
	"github.com/octguy/bakerio/backend/pkg/config"
	"github.com/octguy/bakerio/backend/pkg/txmanager"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
	"go.uber.org/zap"

	_ "github.com/octguy/bakerio/backend/docs"
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
	authModule := auth.NewModule(pool, tx, profileModule.Service(), cfg.JWT.SecretKey, cfg.JWT.Expiry)

	// 6. Init gin engine
	r := gin.Default()

	// 7. Register routes to the engine
	v1 := r.Group("/api/v1")
	authModule.RegisterRoutes(v1)

	// 8. Swagger UI — available at /swagger/index.html
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	logger.Log.Info("starting http server")

	// 8. Start server
	if err := r.Run(":" + cfg.Server.Port); err != nil {
		logger.Log.Fatal("Server start failed", zap.Error(err))
	}
}
