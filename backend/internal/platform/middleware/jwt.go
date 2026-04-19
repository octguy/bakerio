package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/octguy/bakerio/backend/internal/auth/service"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
	"github.com/octguy/bakerio/backend/internal/shared/response"
)

const (
	UserIDKey      = "userID"
	RolesKey       = "roles"
	PermissionsKey = "permissions"
	JTIKey         = "jti"
	ExpiresAtKey   = "expiresAt"
)

// JWTAuth validates the Bearer token, checks the blacklist, and injects claims into context.
func JWTAuth(authSvc service.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			response.Error(c, apperrors.Unauthorized("Authorization header required"))
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			response.Error(c, apperrors.Unauthorized("Authorization header format must be Bearer {token}"))
			c.Abort()
			return
		}

		claims, err := authSvc.ValidateToken(parts[1])
		if err != nil {
			response.Error(c, apperrors.Unauthorized(err.Error()))
			c.Abort()
			return
		}

		revoked, err := authSvc.IsRevoked(c.Request.Context(), claims.ID)
		if err != nil || revoked {
			response.Error(c, apperrors.Unauthorized("token has been revoked"))
			c.Abort()
			return
		}

		c.Set(UserIDKey, claims.UserID)
		c.Set(RolesKey, claims.Roles)
		c.Set(JTIKey, claims.ID)
		c.Set(ExpiresAtKey, claims.ExpiresAt.Time)
		c.Next()
	}
}
