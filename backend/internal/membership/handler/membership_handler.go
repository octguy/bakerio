package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	_ "github.com/octguy/bakerio/backend/internal/membership/dto" // make sure swag walks the dto package
	"github.com/octguy/bakerio/backend/internal/membership/service"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
	"github.com/octguy/bakerio/backend/internal/shared/authcontext"
	"github.com/octguy/bakerio/backend/internal/shared/response"
)

type Handler struct {
	svc service.Service
}

func NewHandler(svc service.Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) RegisterRoutes(protected *gin.RouterGroup) {
	// Any authenticated user can read their own membership. No new permission
	// required — same convention as /profile.
	protected.GET("/membership", h.GetMine)
}

// GetMine godoc
// @Summary      Get caller's membership tier + cumulative spend
// @Description  Returns `{tier, total_spent, next_tier_threshold}`. A user
// @Description  who has never confirmed an order is returned as synthetic
// @Description  BRONZE/0 — no DB row is written for a read.
// @Tags         membership
// @Security     BearerAuth
// @Produce      json
// @Success      200  {object}  dto.MembershipResponse
// @Failure      401  {object}  response.ErrorResponse
// @Router       /membership [get]
func (h *Handler) GetMine(c *gin.Context) {
	userID, ok := authcontext.CallerID(c.Request.Context())
	if !ok {
		response.Error(c, apperrors.Unauthorized("caller identity missing"))
		return
	}
	res, err := h.svc.GetForUser(c.Request.Context(), userID)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, res)
}
