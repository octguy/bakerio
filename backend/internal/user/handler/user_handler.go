package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/octguy/bakerio/backend/internal/platform/middleware"
	profileDto "github.com/octguy/bakerio/backend/internal/profile/dto"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
	"github.com/octguy/bakerio/backend/internal/shared/response"
	"github.com/octguy/bakerio/backend/internal/user/dto"
	"github.com/octguy/bakerio/backend/internal/user/service"
)

type UserHandler struct {
	svc service.UserService
}

func NewUserHandler(svc service.UserService) *UserHandler {
	return &UserHandler{svc: svc}
}

func (h *UserHandler) RegisterRoutes(protected *gin.RouterGroup) {
	g := protected.Group("/users")
	g.POST("",
		middleware.RequireAnyPermission("user:manage:all", "user:manage:branch"),
		h.CreateUser,
	)
	g.GET("/:id/profile",
		middleware.RequireAnyPermission("user:view:all", "user:manage:branch"),
		h.GetUserProfile,
	)
	g.PATCH("/:id/profile",
		middleware.RequireAnyPermission("user:manage:all", "user:manage:branch"),
		h.UpdateUserProfile,
	)
	g.PATCH("/:id/password",
		middleware.RequireAnyPermission("user:manage:all", "user:manage:branch"),
		h.SetUserPassword,
	)
}

// CreateUser godoc
// @Summary      Create a staff account
// @Description  Admin or manager creates a staff account with a specific role. Role must be within the caller's permission level.
// @Tags         users
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        request  body      dto.CreateUserRequest   true  "Create user payload"
// @Success      201      {object}  dto.CreateUserResponse
// @Failure      403      {object}  response.ErrorResponse
// @Failure      409      {object}  response.ErrorResponse
// @Failure      422      {object}  response.ErrorResponse
// @Router       /users [post]
func (h *UserHandler) CreateUser(c *gin.Context) {
	var req dto.CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperrors.Validation(err.Error()))
		return
	}

	raw, _ := c.Get(middleware.PermissionsKey)
	perms, _ := raw.([]string)

	res, err := h.svc.CreateUser(c.Request.Context(), req, perms)
	if err != nil {
		response.Error(c, err)
		return
	}

	response.Success(c, http.StatusCreated, res)
}

// GetUserProfile godoc
// @Summary      Get staff profile
// @Description  Returns the profile of any user. Requires user:view:all or user:manage:branch.
// @Tags         users
// @Security     BearerAuth
// @Produce      json
// @Param        id   path      string  true  "User ID"
// @Success      200  {object}  profileDto.ProfileResponse
// @Failure      403  {object}  response.ErrorResponse
// @Failure      404  {object}  response.ErrorResponse
// @Router       /users/{id}/profile [get]
func (h *UserHandler) GetUserProfile(c *gin.Context) {
	targetID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, apperrors.Validation("invalid user id"))
		return
	}
	res, err := h.svc.GetUserProfile(c.Request.Context(), targetID)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, res)
}

// UpdateUserProfile godoc
// @Summary      Update staff profile
// @Description  Updates display name, avatar URL, and/or bio for a staff member
// @Tags         users
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        id       path      string                       true  "User ID"
// @Param        request  body      profileDto.UpdateProfileRequest  true  "Update profile payload"
// @Success      200      {object}  profileDto.ProfileResponse
// @Failure      403      {object}  response.ErrorResponse
// @Failure      404      {object}  response.ErrorResponse
// @Failure      422      {object}  response.ErrorResponse
// @Router       /users/{id}/profile [patch]
func (h *UserHandler) UpdateUserProfile(c *gin.Context) {
	targetID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, apperrors.Validation("invalid user id"))
		return
	}
	var req profileDto.UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperrors.Validation(err.Error()))
		return
	}
	res, err := h.svc.UpdateUserProfile(c.Request.Context(), targetID, req)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, res)
}

// SetUserPassword godoc
// @Summary      Set staff password
// @Description  Admin/manager sets a new password for a staff member without requiring the current password
// @Tags         users
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        id       path      string                  true  "User ID"
// @Param        request  body      dto.SetPasswordRequest  true  "Password payload"
// @Success      204
// @Failure      403  {object}  response.ErrorResponse
// @Failure      422  {object}  response.ErrorResponse
// @Router       /users/{id}/password [patch]
func (h *UserHandler) SetUserPassword(c *gin.Context) {
	targetID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, apperrors.Validation("invalid user id"))
		return
	}
	var req dto.SetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperrors.Validation(err.Error()))
		return
	}

	if err := h.svc.AdminSetPassword(c.Request.Context(), targetID, req.Password); err != nil {
		response.Error(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
