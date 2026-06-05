package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/octguy/bakerio/backend/internal/platform/logger"
	"github.com/octguy/bakerio/backend/internal/platform/middleware"
	"github.com/octguy/bakerio/backend/pkg/config"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
	"go.uber.org/zap"
)

// runHTTPServer assembles the gin router and blocks on Run until shutdown.
func runHTTPServer(cfg *config.Config, i *infra, mods *modules) {
	r := gin.Default()
	r.Use(corsMiddleware())
	registerInfraRoutes(r, i)

	v1 := r.Group("/api/v1")
	public := v1.Group("/")
	authed := v1.Group("/",
		middleware.JWTAuth(mods.auth.AuthService()),
		middleware.LoadPermissions(mods.auth.RBACService()),
	)

	mods.auth.RegisterRoutes(public, authed)
	mods.user.RegisterRoutes(public, authed)
	mods.branch.RegisterRoutes(public, authed)
	mods.product.RegisterRoutes(public, authed)
	mods.cart.RegisterRoutes(public, authed)
	mods.order.RegisterRoutes(public, authed)
	mods.voucher.RegisterRoutes(public, authed)
	mods.membership.RegisterRoutes(public, authed)

	// Admin-only dev tooling — super_admin (or any holder of *:*:all) only.
	dev := newDevHandler(mods, i.pool)
	adminOnly := authed.Group("", middleware.RequirePermission("*:*:all"))
	adminOnly.POST("/admin/seed-demo", dev.SeedDemo)

	logger.Log.Info("starting http server", zap.String("port", cfg.Server.Port))
	if err := r.Run(":" + cfg.Server.Port); err != nil {
		logger.Log.Fatal("server failed", zap.Error(err))
	}
}

// registerInfraRoutes wires liveness/readiness probes + swagger UI.
//
//	/health        — process alive (docker-compose healthcheck + CI wait loop)
//	/health/ready  — dependencies reachable (DB ping)
//	/swagger/...   — generated API explorer
func registerInfraRoutes(r *gin.Engine, i *infra) {
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})
	r.GET("/health/ready", func(c *gin.Context) {
		if err := i.pool.Ping(c.Request.Context()); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "down", "error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ready"})
	})
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
}

// corsMiddleware returns a permissive CORS handler suitable for dev/CI.
// Tighten in prod by reading allowed origins from env.
func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Authorization, Content-Type, Accept, Origin, X-Requested-With")
		c.Header("Access-Control-Expose-Headers", "Content-Length, Content-Type")
		c.Header("Access-Control-Max-Age", "86400")
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}
