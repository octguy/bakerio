package middleware

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/octguy/bakerio/backend/internal/platform/cache"
)

func RateLimit(redis cache.Cache, limit int, window time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		key := "rl:" + c.ClientIP() + ":" + c.FullPath()
		val, _ := redis.Get(c.Request.Context(), key)
		var count int
		if val != "" {
			fmt.Sscanf(val, "%d", &count)
		}
		if count >= limit {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": gin.H{"code": "RATE_LIMITED", "message": "too many requests, try again later"}})
			return
		}
		_ = redis.Set(c.Request.Context(), key, fmt.Sprintf("%d", count+1), window)
		c.Next()
	}
}
