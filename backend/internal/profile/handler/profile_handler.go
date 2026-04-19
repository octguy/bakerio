package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/octguy/bakerio/backend/internal/platform/middleware"
	"github.com/octguy/bakerio/backend/internal/profile/dto"
	"github.com/octguy/bakerio/backend/internal/profile/service"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
	"github.com/octguy/bakerio/backend/internal/shared/response"
)

type ProfileHandler struct {
	svc service.ProfileService
}

func NewProfileHandler(svc service.ProfileService) *ProfileHandler {
	return &ProfileHandler{svc: svc}
}

func (h *ProfileHandler) RegisterRoutes(protected *gin.RouterGroup) {
	g := protected.Group("/profile")
	g.GET("", h.GetProfile)
	g.PATCH("", h.UpdateProfile)
}

// GetProfile godoc
// @Summary      Get own profile
// @Description  Returns the authenticated user's profile
// @Tags         profile
// @Security     BearerAuth
// @Produce      json
// @Success      200  {object}  dto.ProfileResponse
// @Failure      404  {object}  response.ErrorResponse
// @Router       /profile [get]
func (h *ProfileHandler) GetProfile(c *gin.Context) {
	userID, _ := c.Get(middleware.UserIDKey)
	res, err := h.svc.GetProfile(c.Request.Context(), userID.(uuid.UUID))
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, res)
}

// UpdateProfile godoc
// @Summary      Update own profile
// @Description  Updates display name, avatar URL, and/or bio for the authenticated user
// @Tags         profile
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        request  body      dto.UpdateProfileRequest  true  "Update profile payload"
// @Success      200      {object}  dto.ProfileResponse
// @Failure      404      {object}  response.ErrorResponse
// @Failure      422      {object}  response.ErrorResponse
// @Router       /profile [patch]
func (h *ProfileHandler) UpdateProfile(c *gin.Context) {
	var req dto.UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperrors.Validation(err.Error()))
		return
	}

	userID, _ := c.Get(middleware.UserIDKey)
	res, err := h.svc.UpdateProfile(c.Request.Context(), userID.(uuid.UUID), req)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, res)
}
