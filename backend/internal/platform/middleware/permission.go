package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/octguy/bakerio/backend/internal/auth/service"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
	"github.com/octguy/bakerio/backend/internal/shared/response"
)

// LoadPermissions resolves permissions for the roles set by JWTAuth and stores
// them in context. Must be chained after JWTAuth.
func LoadPermissions(rbacSvc service.RBACService) gin.HandlerFunc {
	return func(c *gin.Context) {
		raw, exists := c.Get(RolesKey)
		if !exists {
			c.Next()
			return
		}

		roles, ok := raw.([]string)
		if !ok {
			c.Next()
			return
		}

		perms, err := rbacSvc.ResolvePermissions(c.Request.Context(), roles)
		if err != nil {
			response.Error(c, apperrors.Internal("failed to resolve permissions", err))
			c.Abort()
			return
		}

		c.Set(PermissionsKey, perms)
		c.Next()
	}
}

// RequirePermission guards a route, allowing only requests whose resolved
// permissions include perm or the wildcard "*:*:all".
func RequirePermission(perm string) gin.HandlerFunc {
	return func(c *gin.Context) {
		raw, _ := c.Get(PermissionsKey)
		perms, _ := raw.([]string)

		for _, p := range perms {
			if p == perm || p == "*:*:all" {
				c.Next()
				return
			}
		}

		response.Error(c, apperrors.Forbidden("insufficient permissions"))
		c.Abort()
	}
}
