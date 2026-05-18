package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/octguy/bakerio/backend/internal/platform/middleware"
	"github.com/octguy/bakerio/backend/internal/product/dto"
	"github.com/octguy/bakerio/backend/internal/product/service"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
	"github.com/octguy/bakerio/backend/internal/shared/response"
)

type ProductHandler struct {
	svc service.ProductService
}

func NewProductHandler(svc service.ProductService) *ProductHandler {
	return &ProductHandler{svc: svc}
}

func (h *ProductHandler) RegisterRoutes(protected *gin.RouterGroup) {
	g := protected.Group("/products")
	{
		g.GET("", middleware.RequirePermission("product:view:all"), h.ListProducts)
		g.GET("/:id", middleware.RequirePermission("product:view:all"), h.GetProduct)
		g.POST("", middleware.RequirePermission("product:manage:all"), h.CreateProduct)
		g.PATCH("/:id", middleware.RequirePermission("product:manage:all"), h.UpdateProduct)
		g.DELETE("/:id", middleware.RequirePermission("product:manage:all"), h.DeleteProduct)

		g.POST("/:id/prices", middleware.RequirePermission("product:manage:all"), h.SetPrice)
		g.GET("/:id/prices", middleware.RequirePermission("product:view:all"), h.GetPriceHistory)
	}
}

// CreateProduct godoc
// @Summary      Create a product
// @Tags         products
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        request body      dto.CreateProductRequest true "Create product payload"
// @Success      201     {object}  dto.ProductResponse
// @Router       /products [post]
func (h *ProductHandler) CreateProduct(c *gin.Context) {
	var req dto.CreateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperrors.Validation(err.Error()))
		return
	}

	res, err := h.svc.CreateProduct(c.Request.Context(), req)
	if err != nil {
		response.Error(c, err)
		return
	}

	response.Success(c, http.StatusCreated, res)
}

// GetProduct godoc
// @Summary      Get product by ID
// @Tags         products
// @Security     BearerAuth
// @Produce      json
// @Param        id   path      string  true "Product ID"
// @Success      200  {object}  dto.ProductResponse
// @Router       /products/{id} [get]
func (h *ProductHandler) GetProduct(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, apperrors.Validation("invalid product id"))
		return
	}

	res, err := h.svc.GetProduct(c.Request.Context(), id)
	if err != nil {
		response.Error(c, err)
		return
	}

	response.Success(c, http.StatusOK, res)
}

// ListProducts godoc
// @Summary      List all products
// @Tags         products
// @Security     BearerAuth
// @Produce      json
// @Success      200  {array}   dto.ProductResponse
// @Router       /products [get]
func (h *ProductHandler) ListProducts(c *gin.Context) {
	res, err := h.svc.ListProducts(c.Request.Context())
	if err != nil {
		response.Error(c, err)
		return
	}

	response.Success(c, http.StatusOK, res)
}

// UpdateProduct godoc
// @Summary      Update a product
// @Tags         products
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        id      path      string                   true "Product ID"
// @Param        request body      dto.UpdateProductRequest true "Update product payload"
// @Success      200     {object}  dto.ProductResponse
// @Router       /products/{id} [patch]
func (h *ProductHandler) UpdateProduct(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, apperrors.Validation("invalid product id"))
		return
	}

	var req dto.UpdateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperrors.Validation(err.Error()))
		return
	}

	res, err := h.svc.UpdateProduct(c.Request.Context(), id, req)
	if err != nil {
		response.Error(c, err)
		return
	}

	response.Success(c, http.StatusOK, res)
}

// DeleteProduct godoc
// @Summary      Soft-delete a product
// @Tags         products
// @Security     BearerAuth
// @Param        id   path      string  true "Product ID"
// @Success      204
// @Router       /products/{id} [delete]
func (h *ProductHandler) DeleteProduct(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, apperrors.Validation("invalid product id"))
		return
	}

	if err := h.svc.DeleteProduct(c.Request.Context(), id); err != nil {
		response.Error(c, err)
		return
	}

	c.Status(http.StatusNoContent)
}

// SetPrice godoc
// @Summary      Set branch-specific price
// @Tags         products
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        id      path      string              true "Product ID"
// @Param        request body      dto.SetPriceRequest true "Set price payload"
// @Success      200     {object}  dto.ProductPriceResponse
// @Router       /products/{id}/prices [post]
func (h *ProductHandler) SetPrice(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, apperrors.Validation("invalid product id"))
		return
	}

	var req dto.SetPriceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperrors.Validation(err.Error()))
		return
	}

	res, err := h.svc.SetPrice(c.Request.Context(), id, req)
	if err != nil {
		response.Error(c, err)
		return
	}

	response.Success(c, http.StatusOK, res)
}

// GetPriceHistory godoc
// @Summary      Get product price history
// @Tags         products
// @Security     BearerAuth
// @Produce      json
// @Param        id   path      string  true "Product ID"
// @Success      200  {array}   dto.ProductPriceHistoryResponse
// @Router       /products/{id}/prices [get]
func (h *ProductHandler) GetPriceHistory(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, apperrors.Validation("invalid product id"))
		return
	}

	res, err := h.svc.GetPriceHistory(c.Request.Context(), id)
	if err != nil {
		response.Error(c, err)
		return
	}

	response.Success(c, http.StatusOK, res)
}
