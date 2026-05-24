package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/octguy/bakerio/backend/internal/cart/dto"
	"github.com/octguy/bakerio/backend/internal/cart/service"
	"github.com/octguy/bakerio/backend/internal/platform/middleware"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
	"github.com/octguy/bakerio/backend/internal/shared/authcontext"
	"github.com/octguy/bakerio/backend/internal/shared/response"
)

type CartHandler struct {
	svc service.CartService
}

func NewCartHandler(svc service.CartService) *CartHandler {
	return &CartHandler{svc: svc}
}

func (h *CartHandler) RegisterRoutes(protected *gin.RouterGroup) {
	g := protected.Group("/cart", middleware.RequirePermission("cart:manage:own"))
	g.GET("", h.GetCart)
	g.POST("/items", h.AddItem)
	g.PATCH("/items/:productId", h.UpdateItem)
	g.DELETE("", h.Clear)
}

func callerID(c *gin.Context) (uuid.UUID, bool) {
	return authcontext.CallerID(c.Request.Context())
}

// GetCart godoc
// @Summary      Get the current user's cart
// @Tags         cart
// @Security     BearerAuth
// @Produce      json
// @Success      200  {object}  dto.CartResponse
// @Router       /cart [get]
func (h *CartHandler) GetCart(c *gin.Context) {
	userID, ok := callerID(c)
	if !ok {
		response.Error(c, apperrors.Unauthorized("caller identity missing"))
		return
	}
	res, err := h.svc.GetCart(c.Request.Context(), userID)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, res)
}

// AddItem godoc
// @Summary      Add an item to the cart
// @Description  Upserts; quantity sums on conflict (capped at 99).
// @Tags         cart
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        request  body      dto.AddItemRequest  true  "Item"
// @Success      200      {object}  dto.CartResponse
// @Failure      422      {object}  response.ErrorResponse
// @Router       /cart/items [post]
func (h *CartHandler) AddItem(c *gin.Context) {
	userID, ok := callerID(c)
	if !ok {
		response.Error(c, apperrors.Unauthorized("caller identity missing"))
		return
	}
	var req dto.AddItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperrors.Validation(err.Error()))
		return
	}
	res, err := h.svc.AddItem(c.Request.Context(), userID, req)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, res)
}

// UpdateItem godoc
// @Summary      Set an item's quantity (0 removes it)
// @Tags         cart
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        productId  path      string                  true  "Product ID"
// @Param        request    body      dto.UpdateItemRequest   true  "Quantity"
// @Success      200        {object}  dto.CartResponse
// @Failure      404        {object}  response.ErrorResponse
// @Failure      422        {object}  response.ErrorResponse
// @Router       /cart/items/{productId} [patch]
func (h *CartHandler) UpdateItem(c *gin.Context) {
	userID, ok := callerID(c)
	if !ok {
		response.Error(c, apperrors.Unauthorized("caller identity missing"))
		return
	}
	productID, err := uuid.Parse(c.Param("productId"))
	if err != nil {
		response.Error(c, apperrors.Validation("invalid product id"))
		return
	}
	var req dto.UpdateItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperrors.Validation(err.Error()))
		return
	}
	res, err := h.svc.UpdateItem(c.Request.Context(), userID, productID, req.Quantity)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, res)
}

// Clear godoc
// @Summary      Empty the cart
// @Tags         cart
// @Security     BearerAuth
// @Success      204
// @Router       /cart [delete]
func (h *CartHandler) Clear(c *gin.Context) {
	userID, ok := callerID(c)
	if !ok {
		response.Error(c, apperrors.Unauthorized("caller identity missing"))
		return
	}
	if err := h.svc.Clear(c.Request.Context(), userID); err != nil {
		response.Error(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
