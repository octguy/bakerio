package handler

import (
	"errors"
	"net/http"
	"slices"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	branchSvc "github.com/octguy/bakerio/backend/internal/branch/service"
	"github.com/octguy/bakerio/backend/internal/platform/middleware"
	"github.com/octguy/bakerio/backend/internal/product/dto"
	"github.com/octguy/bakerio/backend/internal/product/service"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
	"github.com/octguy/bakerio/backend/internal/shared/authcontext"
	"github.com/octguy/bakerio/backend/internal/shared/response"
)

type ProductHandler struct {
	svc           service.ProductService
	membershipSvc branchSvc.MembershipService
}

func NewProductHandler(svc service.ProductService, membershipSvc branchSvc.MembershipService) *ProductHandler {
	return &ProductHandler{svc: svc, membershipSvc: membershipSvc}
}

func (h *ProductHandler) RegisterRoutes(protected *gin.RouterGroup) {
	g := protected.Group("/products")
	g.GET("", middleware.RequirePermission("product:view:all"), h.ListProducts)
	g.GET("/:id", middleware.RequirePermission("product:view:all"), h.GetProduct)
	g.POST("", middleware.RequirePermission("product:manage:all"), h.CreateProduct)
	g.PATCH("/:id", middleware.RequirePermission("product:manage:all"), h.UpdateProduct)
	g.DELETE("/:id", middleware.RequirePermission("product:manage:all"), h.DeleteProduct)

	// Per-branch availability toggle. Admin (product:manage:all) any branch;
	// branch_manager (branch:manage:own) only their own — checked in the handler.
	protected.PUT("/branch/:id/products/:productId",
		middleware.RequireAnyPermission("product:manage:all", "branch:manage:own"),
		h.SetAvailability,
	)
}

// CreateProduct godoc
// @Summary      Create product
// @Tags         product
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        request  body      dto.CreateProductRequest  true  "Create product"
// @Success      201      {object}  dto.ProductResponse
// @Failure      422      {object}  response.ErrorResponse
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

// ListProducts godoc
// @Summary      List products
// @Tags         product
// @Security     BearerAuth
// @Produce      json
// @Param        category  query     string  false  "Filter by category ID"
// @Param        page      query     int     false  "Page (default 1)"
// @Param        size      query     int     false  "Page size (default 20)"
// @Success      200       {object}  dto.ProductListResponse
// @Router       /products [get]
func (h *ProductHandler) ListProducts(c *gin.Context) {
	var categoryID *uuid.UUID
	if raw := c.Query("category"); raw != "" {
		id, err := uuid.Parse(raw)
		if err != nil {
			response.Error(c, apperrors.Validation("invalid category id"))
			return
		}
		categoryID = &id
	}
	page := atoi32(c.Query("page"), 1)
	size := atoi32(c.Query("size"), 20)

	res, err := h.svc.ListProducts(c.Request.Context(), categoryID, page, size)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, res)
}

// GetProduct godoc
// @Summary      Get product by ID or slug
// @Tags         product
// @Security     BearerAuth
// @Produce      json
// @Param        id   path      string  true  "Product ID or slug"
// @Success      200  {object}  dto.ProductResponse
// @Failure      404  {object}  response.ErrorResponse
// @Router       /products/{id} [get]
func (h *ProductHandler) GetProduct(c *gin.Context) {
	param := c.Param("id")
	var (
		res dto.ProductResponse
		err error
	)
	if id, perr := uuid.Parse(param); perr == nil {
		res, err = h.svc.GetProduct(c.Request.Context(), id)
	} else {
		res, err = h.svc.GetProductBySlug(c.Request.Context(), param)
	}
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, res)
}

// UpdateProduct godoc
// @Summary      Update product
// @Tags         product
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        id       path      string                    true  "Product ID"
// @Param        request  body      dto.UpdateProductRequest  true  "Update product"
// @Success      200      {object}  dto.ProductResponse
// @Failure      422      {object}  response.ErrorResponse
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
// @Summary      Delete product (soft)
// @Tags         product
// @Security     BearerAuth
// @Param        id   path  string  true  "Product ID"
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

// SetAvailability godoc
// @Summary      Toggle product availability at a branch
// @Description  Admin may target any branch; a branch_manager only their own.
// @Tags         product
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        id         path      string                       true  "Branch ID"
// @Param        productId  path      string                       true  "Product ID"
// @Param        request    body      dto.SetAvailabilityRequest   true  "Availability"
// @Success      200        {object}  dto.BranchProductResponse
// @Failure      403        {object}  response.ErrorResponse
// @Failure      404        {object}  response.ErrorResponse
// @Router       /branch/{id}/products/{productId} [put]
func (h *ProductHandler) SetAvailability(c *gin.Context) {
	branchID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, apperrors.Validation("invalid branch id"))
		return
	}
	productID, err := uuid.Parse(c.Param("productId"))
	if err != nil {
		response.Error(c, apperrors.Validation("invalid product id"))
		return
	}
	if err := h.ensureBranchScope(c, branchID); err != nil {
		response.Error(c, err)
		return
	}

	var req dto.SetAvailabilityRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperrors.Validation(err.Error()))
		return
	}

	res, err := h.svc.SetBranchAvailability(c.Request.Context(), productID, branchID, req.IsActive)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, res)
}

// ensureBranchScope: admin (wildcard or product:manage:all) may touch any
// branch; everyone else may touch only the branch they belong to.
func (h *ProductHandler) ensureBranchScope(c *gin.Context, target uuid.UUID) error {
	raw, _ := c.Get(middleware.PermissionsKey)
	perms, _ := raw.([]string)
	if slices.Contains(perms, "*:*:all") || slices.Contains(perms, "product:manage:all") {
		return nil
	}

	callerID, ok := authcontext.CallerID(c.Request.Context())
	if !ok {
		return apperrors.Forbidden("caller identity missing")
	}
	mb, err := h.membershipSvc.GetMembership(c.Request.Context(), callerID)
	if err != nil {
		var ae *apperrors.AppError
		if errors.As(err, &ae) && ae.Code == apperrors.CodeNotFound {
			return apperrors.Forbidden("you do not belong to any branch")
		}
		return err
	}
	if mb.BranchID != target {
		return apperrors.Forbidden("you can only manage products of your own branch")
	}
	return nil
}

func atoi32(s string, def int32) int32 {
	if s == "" {
		return def
	}
	n, err := strconv.Atoi(s)
	if err != nil {
		return def
	}
	return int32(n)
}
