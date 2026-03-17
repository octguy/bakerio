package main

import (
	"github.com/gin-gonic/gin"
	"github.com/octguy/bakerio/backend/internal/platform/logger"
	"github.com/octguy/bakerio/backend/pkg/config"
	"go.uber.org/zap"
)

func main() {
	cfg := config.Load()
	logger.Init(cfg.Server.Env)
	defer logger.Sync()

	r := gin.Default()
	r.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "Hello, thinhdeptrainhatthegioi!",
		})
	})

	logger.Log.Info("Server started successfully")

	if err := r.Run(); err != nil {
		logger.Log.Fatal("Server start failed: ", zap.String("hehe", "vcl"))
	}
}
