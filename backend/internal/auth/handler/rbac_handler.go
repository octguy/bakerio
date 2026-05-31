package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/octguy/bakerio/backend/internal/auth/dto"
	"github.com/octguy/bakerio/backend/internal/auth/service"
	"github.com/octguy/bakerio/backend/internal/platform/middleware"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
	"github.com/octguy/bakerio/backend/internal/shared/response"
)

type RbacHandler struct {
	rbacService service.RBACService
}

func NewRbacHandler(rbacService service.RBACService) *RbacHandler {
	return &RbacHandler{rbacService: rbacService}
}

func (h *RbacHandler) RegisterRoutes(protected *gin.RouterGroup) {
	// Admin-only: super_admin holds *:*:all and bypasses everything else.
	g := protected.Group("", middleware.RequirePermission("*:*:all"))

	g.GET("/roles", h.GetRoles)
	g.GET("/roles/:id", h.GetRole)
	g.POST("/roles", h.CreateRole)
	g.PUT("/roles/:id", h.UpdateRole)

	g.GET("/permissions", h.GetPermissions)
	g.GET("/permissions/:id", h.GetPermission)

	g.GET("/roles/:id/permissions", h.GetRolePermissions)
	g.PUT("/roles/:id/permissions", h.UpdateRolePermissions)
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

func toRoleResponse(r *domain.Role) dto.RoleResponse {
	return dto.RoleResponse{ID: r.ID, Name: r.Name, Description: r.Description}
}

func toPermissionResponse(p *domain.Permission) dto.PermissionResponse {
	return dto.PermissionResponse{ID: p.ID, Name: p.Name}
}

func parseUUIDParam(c *gin.Context, name string) (uuid.UUID, bool) {
	id, err := uuid.Parse(c.Param(name))
	if err != nil {
		response.Error(c, apperrors.Validation("invalid "+name))
		return uuid.Nil, false
	}
	return id, true
}

// ────────────────────────────────────────────────────────────────────────────
// Roles
// ────────────────────────────────────────────────────────────────────────────

// GetRoles godoc
// @Summary      List all roles
// @Tags         rbac
// @Security     BearerAuth
// @Produce      json
// @Success      200  {array}   dto.RoleResponse
// @Failure      403  {object}  response.ErrorResponse
// @Router       /roles [get]
func (h *RbacHandler) GetRoles(c *gin.Context) {
	roles, err := h.rbacService.GetAllRoles(c.Request.Context())
	if err != nil {
		response.Error(c, err)
		return
	}
	out := make([]dto.RoleResponse, 0, len(roles))
	for _, r := range roles {
		out = append(out, toRoleResponse(r))
	}
	response.Success(c, http.StatusOK, out)
}

// GetRole godoc
// @Summary      Get role details by ID
// @Tags         rbac
// @Security     BearerAuth
// @Produce      json
// @Param        id   path      string  true  "Role ID"
// @Success      200  {object}  dto.RoleResponse
// @Failure      404  {object}  response.ErrorResponse
// @Router       /roles/{id} [get]
func (h *RbacHandler) GetRole(c *gin.Context) {
	id, ok := parseUUIDParam(c, "id")
	if !ok {
		return
	}
	role, err := h.rbacService.GetRoleByID(c.Request.Context(), id)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, toRoleResponse(role))
}

// CreateRole godoc
// @Summary      Create a new role
// @Tags         rbac
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        request  body      dto.CreateRoleRequest  true  "Role payload"
// @Success      201      {object}  dto.RoleResponse
// @Failure      409      {object}  response.ErrorResponse
// @Failure      422      {object}  response.ErrorResponse
// @Router       /roles [post]
func (h *RbacHandler) CreateRole(c *gin.Context) {
	var req dto.CreateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperrors.Validation(err.Error()))
		return
	}
	role, err := h.rbacService.CreateRole(c.Request.Context(), req.Name, req.Description)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusCreated, toRoleResponse(role))
}

// UpdateRole godoc
// @Summary      Update an existing role
// @Tags         rbac
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        id       path      string                 true  "Role ID"
// @Param        request  body      dto.UpdateRoleRequest  true  "Role payload"
// @Success      200      {object}  dto.RoleResponse
// @Failure      404      {object}  response.ErrorResponse
// @Failure      409      {object}  response.ErrorResponse
// @Failure      422      {object}  response.ErrorResponse
// @Router       /roles/{id} [put]
func (h *RbacHandler) UpdateRole(c *gin.Context) {
	id, ok := parseUUIDParam(c, "id")
	if !ok {
		return
	}
	var req dto.UpdateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperrors.Validation(err.Error()))
		return
	}
	role, err := h.rbacService.UpdateRole(c.Request.Context(), id, req.Name, req.Description)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, toRoleResponse(role))
}

// ────────────────────────────────────────────────────────────────────────────
// Permissions
// ────────────────────────────────────────────────────────────────────────────

// GetPermissions godoc
// @Summary      List all permissions
// @Tags         rbac
// @Security     BearerAuth
// @Produce      json
// @Success      200  {array}   dto.PermissionResponse
// @Failure      403  {object}  response.ErrorResponse
// @Router       /permissions [get]
func (h *RbacHandler) GetPermissions(c *gin.Context) {
	perms, err := h.rbacService.GetAllPermissions(c.Request.Context())
	if err != nil {
		response.Error(c, err)
		return
	}
	out := make([]dto.PermissionResponse, 0, len(perms))
	for _, p := range perms {
		out = append(out, toPermissionResponse(p))
	}
	response.Success(c, http.StatusOK, out)
}

// GetPermission godoc
// @Summary      Get permission details by ID
// @Tags         rbac
// @Security     BearerAuth
// @Produce      json
// @Param        id   path      string  true  "Permission ID"
// @Success      200  {object}  dto.PermissionResponse
// @Failure      404  {object}  response.ErrorResponse
// @Router       /permissions/{id} [get]
func (h *RbacHandler) GetPermission(c *gin.Context) {
	id, ok := parseUUIDParam(c, "id")
	if !ok {
		return
	}
	perm, err := h.rbacService.GetPermissionByID(c.Request.Context(), id)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, toPermissionResponse(perm))
}

// ────────────────────────────────────────────────────────────────────────────
// Role ↔ Permissions
// ────────────────────────────────────────────────────────────────────────────

// GetRolePermissions godoc
// @Summary      Get all permissions assigned to a role
// @Tags         rbac
// @Security     BearerAuth
// @Produce      json
// @Param        id   path      string  true  "Role ID"
// @Success      200  {array}   dto.PermissionResponse
// @Failure      404  {object}  response.ErrorResponse
// @Router       /roles/{id}/permissions [get]
func (h *RbacHandler) GetRolePermissions(c *gin.Context) {
	id, ok := parseUUIDParam(c, "id")
	if !ok {
		return
	}
	perms, err := h.rbacService.GetPermissionsByRoleID(c.Request.Context(), id)
	if err != nil {
		response.Error(c, err)
		return
	}
	out := make([]dto.PermissionResponse, 0, len(perms))
	for _, p := range perms {
		out = append(out, toPermissionResponse(p))
	}
	response.Success(c, http.StatusOK, out)
}

// UpdateRolePermissions godoc
// @Summary      Update the set of permissions assigned to a role
// @Description  Replaces the role's permission set with the provided list. Send the full desired set (PUT semantics).
// @Tags         rbac
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        id       path      string                            true  "Role ID"
// @Param        request  body      dto.UpdateRolePermissionsRequest  true  "Desired permission IDs"
// @Success      204
// @Failure      404      {object}  response.ErrorResponse
// @Failure      422      {object}  response.ErrorResponse
// @Router       /roles/{id}/permissions [put]
func (h *RbacHandler) UpdateRolePermissions(c *gin.Context) {
	id, ok := parseUUIDParam(c, "id")
	if !ok {
		return
	}
	var req dto.UpdateRolePermissionsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperrors.Validation(err.Error()))
		return
	}
	if err := h.rbacService.UpdatePermissionsForRole(c.Request.Context(), id, req.PermissionIDs); err != nil {
		response.Error(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
