package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/octguy/bakerio/backend/internal/order/dto"
	"github.com/octguy/bakerio/backend/internal/order/service"
	"github.com/octguy/bakerio/backend/internal/platform/middleware"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
	"github.com/octguy/bakerio/backend/internal/shared/authcontext"
	"github.com/octguy/bakerio/backend/internal/shared/response"
)

type CheckoutHandler struct {
	svc service.CheckoutService
}

func NewCheckoutHandler(svc service.CheckoutService) *CheckoutHandler {
	return &CheckoutHandler{svc: svc}
}

func (h *CheckoutHandler) RegisterRoutes(protected *gin.RouterGroup) {
	g := protected.Group("/orders", middleware.RequirePermission("order:create:own"))
	g.POST("/select-branch", h.SelectBranch)
	g.POST("/confirm", h.Confirm)
}

// SelectBranch godoc
// @Summary      Lock a quote into a 10-minute checkout session
// @Description  After /orders/find-branches returned options, the client passes the chosen branch_id back here. Server re-verifies eligibility, freezes the prices + shipping fee, and stores a Redis session for 10 minutes. Returns session_id to confirm with.
// @Tags         orders
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        request  body      dto.SelectBranchRequest   true  "Selection payload"
// @Success      200      {object}  dto.SelectBranchResponse
// @Failure      409      {object}  response.ErrorResponse  "BRANCH_NOT_ELIGIBLE or STOCK_CONFLICT"
// @Failure      422      {object}  response.ErrorResponse
// @Router       /orders/select-branch [post]
func (h *CheckoutHandler) SelectBranch(c *gin.Context) {
	userID, ok := authcontext.CallerID(c.Request.Context())
	if !ok {
		response.Error(c, apperrors.Unauthorized("caller identity missing"))
		return
	}
	var req dto.SelectBranchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperrors.Validation(err.Error()))
		return
	}
	res, err := h.svc.SelectBranch(c.Request.Context(), userID, req)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, res)
}

// Confirm godoc
// @Summary      Place the order from a checkout session
// @Description  Pops the session (exactly-once: double-tap returns SESSION_EXPIRED), atomically locks + decrements stock, writes the order rows. Stock race loss returns 409 STOCK_CONFLICT — client should re-route via /orders/find-branches.
// @Tags         orders
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        request  body      dto.ConfirmOrderRequest   true  "Session reference"
// @Success      201      {object}  dto.OrderResponse
// @Failure      403      {object}  response.ErrorResponse  "session belongs to another user"
// @Failure      409      {object}  response.ErrorResponse  "STOCK_CONFLICT"
// @Failure      410      {object}  response.ErrorResponse  "SESSION_EXPIRED (expired or already used)"
// @Failure      422      {object}  response.ErrorResponse
// @Router       /orders/confirm [post]
func (h *CheckoutHandler) Confirm(c *gin.Context) {
	userID, ok := authcontext.CallerID(c.Request.Context())
	if !ok {
		response.Error(c, apperrors.Unauthorized("caller identity missing"))
		return
	}
	var req dto.ConfirmOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperrors.Validation(err.Error()))
		return
	}
	res, err := h.svc.Confirm(c.Request.Context(), userID, req.SessionID)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusCreated, res)
}
