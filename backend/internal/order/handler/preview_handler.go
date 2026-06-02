package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/octguy/bakerio/backend/internal/order/dto"
	"github.com/octguy/bakerio/backend/internal/order/service"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
	"github.com/octguy/bakerio/backend/internal/shared/response"
)

type PreviewHandler struct {
	svc service.PreviewService
}

func NewPreviewHandler(svc service.PreviewService) *PreviewHandler {
	return &PreviewHandler{svc: svc}
}

func (h *PreviewHandler) RegisterRoutes(protected *gin.RouterGroup) {
	// No order:* permissions seeded yet — authentication is sufficient for
	// v1 preview. Will tighten to `order:create:own` when the permission
	// migration lands alongside the real POST /orders endpoint.
	g := protected.Group("/orders")
	g.POST("/find-branches", h.FindBranches)
}

// FindBranches godoc
// @Summary      Find branches that can fulfill the cart
// @Description  Stateless preview: pass items + shipping coordinates, get back the ranked list of branches that have every item in stock, sorted by shipping fee (then by exact distance). When no branch can fulfill the cart, `options` is empty and `missing` names the offending items.
// @Tags         orders
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        request  body      dto.FindBranchesRequest   true  "Routing input"
// @Success      200      {object}  dto.FindBranchesResponse
// @Failure      422      {object}  response.ErrorResponse
// @Router       /orders/find-branches [post]
func (h *PreviewHandler) FindBranches(c *gin.Context) {
	var req dto.FindBranchesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperrors.Validation(err.Error()))
		return
	}
	res, err := h.svc.FindBranches(c.Request.Context(), req)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, res)
}
