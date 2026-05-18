package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/octguy/bakerio/backend/internal/platform/middleware"
	"github.com/octguy/bakerio/backend/internal/product/service"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
	"github.com/octguy/bakerio/backend/internal/shared/response"
)

var allowedImageTypes = map[string]bool{
	"image/jpeg": true,
	"image/png":  true,
	"image/webp": true,
}

type ImageHandler struct {
	svc     service.ImageService
	maxSize int64
}

func NewImageHandler(svc service.ImageService, maxSize int64) *ImageHandler {
	return &ImageHandler{svc: svc, maxSize: maxSize}
}

func (h *ImageHandler) RegisterRoutes(protected *gin.RouterGroup) {
	images := protected.Group("/products/:id/images")
	{
		images.POST("", middleware.RequirePermission("product:manage:all"), h.Upload)
		images.DELETE("/:imgId", middleware.RequirePermission("product:manage:all"), h.Delete)
		images.PATCH("/:imgId/primary", middleware.RequirePermission("product:manage:all"), h.SetPrimary)
	}
}

// Upload godoc
// @Summary      Upload product image
// @Tags         products
// @Security     BearerAuth
// @Accept       multipart/form-data
// @Produce      json
// @Param        id          path      string  true  "Product ID"
// @Param        file        formData  file    true  "Image file"
// @Param        is_primary  formData  bool    false "Is primary image"
// @Success      201         {object}  dto.ProductImageResponse
// @Router       /products/{id}/images [post]
func (h *ImageHandler) Upload(c *gin.Context) {
	productID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, apperrors.Validation("invalid product id"))
		return
	}

	file, err := c.FormFile("file")
	if err != nil {
		response.Error(c, apperrors.Validation("file is required"))
		return
	}

	if file.Size > h.maxSize {
		response.Error(c, apperrors.Validation("file too large"))
		return
	}

	contentType := file.Header.Get("Content-Type")
	if !allowedImageTypes[contentType] {
		response.Error(c, apperrors.Validation("invalid file type. allowed: jpeg, png, webp"))
		return
	}

	isPrimary := c.PostForm("is_primary") == "true"

	f, err := file.Open()
	if err != nil {
		response.Error(c, apperrors.Internal("failed to open file", err))
		return
	}
	defer f.Close()

	res, err := h.svc.UploadImage(c.Request.Context(), productID, f, contentType, isPrimary)
	if err != nil {
		response.Error(c, err)
		return
	}

	response.Success(c, http.StatusCreated, res)
}

func (h *ImageHandler) Delete(c *gin.Context) {
	imageID, err := uuid.Parse(c.Param("imgId"))
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

func (h *ImageHandler) SetPrimary(c *gin.Context) {
	productID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, apperrors.Validation("invalid product id"))
		return
	}

	imageID, err := uuid.Parse(c.Param("imgId"))
	if err != nil {
		response.Error(c, apperrors.Validation("invalid image id"))
		return
	}

	if err := h.svc.SetPrimary(c.Request.Context(), productID, imageID); err != nil {
		response.Error(c, err)
		return
	}

	c.Status(http.StatusNoContent)
}
