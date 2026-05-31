package handler

import (
	"errors"
	"mime/multipart"
	"net/http"
	"path/filepath"
	"slices"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	branchSvc "github.com/octguy/bakerio/backend/internal/branch/service"
	"github.com/octguy/bakerio/backend/internal/platform/middleware"
	"github.com/octguy/bakerio/backend/internal/product/dto"
	"github.com/octguy/bakerio/backend/internal/product/service"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
	"github.com/octguy/bakerio/backend/internal/shared/authcontext"
	"github.com/octguy/bakerio/backend/internal/shared/response"
	"github.com/octguy/bakerio/backend/pkg/pagination"
)

type ProductHandler struct {
	svc           service.ProductService
	membershipSvc branchSvc.MembershipService
}

func NewProductHandler(svc service.ProductService, membershipSvc branchSvc.MembershipService) *ProductHandler {
	return &ProductHandler{svc: svc, membershipSvc: membershipSvc}
}

func (h *ProductHandler) RegisterRoutes(public, protected *gin.RouterGroup) {
	publicProducts := public.Group("/products")
	publicProducts.GET("", h.ListProducts)
	publicProducts.GET("/:id", h.GetProduct)
	publicProducts.GET("/:id/images", h.ListImages)

	g := protected.Group("/products")
	g.POST("", middleware.RequirePermission("product:manage:all"), h.CreateProduct)
	g.PATCH("/:id", middleware.RequirePermission("product:manage:all"), h.UpdateProduct)
	g.DELETE("/:id", middleware.RequirePermission("product:manage:all"), h.DeleteProduct)

	// Images
	g.POST("/:id/images", middleware.RequirePermission("product:manage:all"), h.AddImages)
	g.DELETE("/:id/images/:imageId", middleware.RequirePermission("product:manage:all"), h.DeleteImage)

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
// @Produce      json
// @Param        category  query     string  false  "Filter by category slug"
// @Param        page      query     int     false  "Page (default 1)"
// @Param        size      query     int     false  "Page size (default 20)"
// @Success      200       {object}  dto.ProductListResponse
// @Router       /products [get]
func (h *ProductHandler) ListProducts(c *gin.Context) {
	var categorySlug *string
	if raw := c.Query("category"); raw != "" {
		categorySlug = &raw
	}
	res, err := h.svc.ListProducts(c.Request.Context(), categorySlug, pagination.FromQuery(c))
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, res)
}

// GetProduct godoc
// @Summary      Get product by ID or slug
// @Tags         product
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

const maxImageSize = 5 << 20 // 5 MB

// AddImages godoc
// @Summary      Upload one or more product images
// @Description  Send one or more files under the "files" form field. Optional
// @Description  repeated "alt_text" fields are matched to files by position.
// @Tags         product
// @Security     BearerAuth
// @Accept       multipart/form-data
// @Produce      json
// @Param        id        path      string  true   "Product ID"
// @Param        files     formData  file    true   "Image files (repeatable)"
// @Param        alt_text  formData  string  false  "Alt text per file (repeatable)"
// @Success      201  {array}   dto.ProductImageResponse
// @Failure      404  {object}  response.ErrorResponse
// @Failure      422  {object}  response.ErrorResponse
// @Router       /products/{id}/images [post]
func (h *ProductHandler) AddImages(c *gin.Context) {
	productID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, apperrors.Validation("invalid product id"))
		return
	}

	form, err := c.MultipartForm()
	if err != nil {
		response.Error(c, apperrors.Validation("invalid multipart form"))
		return
	}
	headers := form.File["files"]
	if len(headers) == 0 {
		headers = form.File["file"] // tolerate the single-field name too
	}
	if len(headers) == 0 {
		response.Error(c, apperrors.Validation("at least one file is required"))
		return
	}
	altTexts := form.Value["alt_text"]

	uploads := make([]service.ImageUpload, 0, len(headers))
	var opened []multipart.File
	defer func() {
		for _, f := range opened {
			_ = f.Close()
		}
	}()

	for i, fh := range headers {
		if fh.Size > maxImageSize {
			response.Error(c, apperrors.Validation("each image must be 5MB or smaller"))
			return
		}
		contentType := fh.Header.Get("Content-Type")
		if !strings.HasPrefix(contentType, "image/") {
			response.Error(c, apperrors.Validation("all files must be images"))
			return
		}
		f, err := fh.Open()
		if err != nil {
			response.Error(c, apperrors.Internal("failed to read upload", err))
			return
		}
		opened = append(opened, f)

		var altText *string
		if i < len(altTexts) && altTexts[i] != "" {
			v := altTexts[i]
			altText = &v
		}
		uploads = append(uploads, service.ImageUpload{
			Reader:      f,
			Size:        fh.Size,
			ContentType: contentType,
			Ext:         strings.ToLower(filepath.Ext(fh.Filename)),
			AltText:     altText,
		})
	}

	res, err := h.svc.AddImages(c.Request.Context(), productID, uploads)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusCreated, res)
}

// ListImages godoc
// @Summary      List product images
// @Tags         product
// @Produce      json
// @Param        id   path      string  true  "Product ID"
// @Success      200  {array}   dto.ProductImageResponse
// @Router       /products/{id}/images [get]
func (h *ProductHandler) ListImages(c *gin.Context) {
	productID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, apperrors.Validation("invalid product id"))
		return
	}
	res, err := h.svc.ListImages(c.Request.Context(), productID)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, res)
}

// DeleteImage godoc
// @Summary      Delete a product image
// @Tags         product
// @Security     BearerAuth
// @Param        id        path  string  true  "Product ID"
// @Param        imageId   path  string  true  "Image ID"
// @Success      204
// @Failure      404  {object}  response.ErrorResponse
// @Router       /products/{id}/images/{imageId} [delete]
func (h *ProductHandler) DeleteImage(c *gin.Context) {
	imageID, err := uuid.Parse(c.Param("imageId"))
	if err != nil {
		response.Error(c, apperrors.Validation("invalid image id"))
		return
	}
	if err := h.svc.DeleteImage(c.Request.Context(), imageID); err != nil {
		response.Error(c, err)
		return
	}
	c.Status(http.StatusNoContent)
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
