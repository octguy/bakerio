package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/octguy/bakerio/backend/internal/platform/middleware"
	"github.com/octguy/bakerio/backend/internal/procurement/dto"
	"github.com/octguy/bakerio/backend/internal/procurement/service"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
	"github.com/octguy/bakerio/backend/internal/shared/response"
)

type SupplierHandler struct {
	svc service.SupplierService
}

func NewSupplierHandler(svc service.SupplierService) *SupplierHandler {
	return &SupplierHandler{svc: svc}
}

func (h *SupplierHandler) RegisterRoutes(protected *gin.RouterGroup) {
	g := protected.Group("/suppliers")
	{
		g.GET("", middleware.RequirePermission("supplier:view:all"), h.List)
		g.GET("/:id", middleware.RequirePermission("supplier:view:all"), h.Get)
		g.POST("", middleware.RequirePermission("supplier:manage:all"), h.Create)
		g.PATCH("/:id", middleware.RequirePermission("supplier:manage:all"), h.Update)
		g.DELETE("/:id", middleware.RequirePermission("supplier:manage:all"), h.Delete)
	}
}

// Create godoc
// @Summary      Create a supplier
// @Tags         suppliers
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        request body      dto.CreateSupplierRequest true "Create supplier payload"
// @Success      201     {object}  dto.SupplierResponse
// @Router       /suppliers [post]
func (h *SupplierHandler) Create(c *gin.Context) {
	var req dto.CreateSupplierRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperrors.Validation(err.Error()))
		return
	}

	res, err := h.svc.Create(c.Request.Context(), req)
	if err != nil {
		response.Error(c, err)
		return
	}

	response.Success(c, http.StatusCreated, res)
}

// Get godoc
// @Summary      Get supplier by ID
// @Tags         suppliers
// @Security     BearerAuth
// @Produce      json
// @Param        id   path      string  true "Supplier ID"
// @Success      200  {object}  dto.SupplierResponse
// @Router       /suppliers/{id} [get]
func (h *SupplierHandler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, apperrors.Validation("invalid supplier id"))
		return
	}

	res, err := h.svc.Get(c.Request.Context(), id)
	if err != nil {
		response.Error(c, err)
		return
	}

	response.Success(c, http.StatusOK, res)
}

// List godoc
// @Summary      List suppliers by region
// @Tags         suppliers
// @Security     BearerAuth
// @Produce      json
// @Param        region query     string  false "Filter by region (north, central, south)"
// @Success      200  {array}   dto.SupplierResponse
// @Router       /suppliers [get]
func (h *SupplierHandler) List(c *gin.Context) {
	region := c.Query("region")
	// If region not provided, how do we handle it? 
	// The service currently requires a region string.
	// We might want to default to the branch's region if not provided and caller has branch.
	
	res, err := h.svc.List(c.Request.Context(), region)
	if err != nil {
		response.Error(c, err)
		return
	}

	response.Success(c, http.StatusOK, res)
}

// Update godoc
// @Summary      Update a supplier
// @Tags         suppliers
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        id      path      string                   true "Supplier ID"
// @Param        request body      dto.UpdateSupplierRequest true "Update supplier payload"
// @Success      200     {object}  dto.SupplierResponse
// @Router       /suppliers/{id} [patch]
func (h *SupplierHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, apperrors.Validation("invalid supplier id"))
		return
	}

	var req dto.UpdateSupplierRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperrors.Validation(err.Error()))
		return
	}

	res, err := h.svc.Update(c.Request.Context(), id, req)
	if err != nil {
		response.Error(c, err)
		return
	}

	response.Success(c, http.StatusOK, res)
}

// Delete godoc
// @Summary      Soft-delete a supplier
// @Tags         suppliers
// @Security     BearerAuth
// @Param        id   path      string  true "Supplier ID"
// @Success      204
// @Router       /suppliers/{id} [delete]
func (h *SupplierHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, apperrors.Validation("invalid supplier id"))
		return
	}

	if err := h.svc.Delete(c.Request.Context(), id); err != nil {
		response.Error(c, err)
		return
	}

	c.Status(http.StatusNoContent)
}
