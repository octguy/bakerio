package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/octguy/bakerio/backend/internal/auth/dto"
	"github.com/octguy/bakerio/backend/internal/auth/service"
	"github.com/octguy/bakerio/backend/internal/platform/logger"
	"github.com/octguy/bakerio/backend/internal/platform/middleware"
	"github.com/octguy/bakerio/backend/internal/shared/response"
	"go.uber.org/zap"
)

type RbacHandler struct {
	rbacService service.RBACService
}

func NewRbacHandler(rbacService service.RBACService) *RbacHandler {
	return &RbacHandler{
		rbacService: rbacService,
	}
}

func (h *RbacHandler) RegisterRoutes(protected *gin.RouterGroup) {
	// Admin-only: super_admin holds *:*:all and bypasses everything else.
	g := protected.Group("/rbac", middleware.RequirePermission("*:*:all"))
	g.GET("/roles", h.GetRoles)
}

// GetRoles godoc
// @Summary      List all roles
// @Description  Returns all roles defined in the system
// @Tags         rbac
// @Security     BearerAuth
// @Produce      json
// @Success      200  {array}   dto.RoleResponse
// @Failure      401  {object}  response.ErrorResponse
// @Router       /rbac/roles [get]
func (h *RbacHandler) GetRoles(c *gin.Context) {
	roles, err := h.rbacService.GetAllRoles(c.Request.Context())
	if err != nil {
		logger.Log.Error("failed to get roles", zap.Error(err))
		response.Error(c, err)
		return
	}

	res := make([]dto.RoleResponse, 0)
	for _, row := range roles {
		res = append(res, dto.RoleResponse{
			ID:          row.ID,
			Name:        row.Name,
			Description: row.Description,
		})
	}

	response.Success(c, http.StatusOK, res)
}
