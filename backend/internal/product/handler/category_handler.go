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

type CategoryHandler struct {
	svc service.CategoryService
}

func NewCategoryHandler(svc service.CategoryService) *CategoryHandler {
	return &CategoryHandler{svc: svc}
}

func (h *CategoryHandler) RegisterRoutes(public, protected *gin.RouterGroup) {
	publicCategories := public.Group("/categories")
	publicCategories.GET("", h.ListCategories)
	publicCategories.GET("/:id", h.GetCategory)

	g := protected.Group("/categories")
	g.POST("", middleware.RequirePermission("product:manage:all"), h.CreateCategory)
	g.PATCH("/:id", middleware.RequirePermission("product:manage:all"), h.UpdateCategory)
	g.DELETE("/:id", middleware.RequirePermission("product:manage:all"), h.DeleteCategory)
}

// CreateCategory godoc
// @Summary      Create a product category
// @Tags         categories
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        request body      dto.CreateCategoryRequest true "Create category payload"
// @Success      201     {object}  dto.CategoryResponse
// @Router       /categories [post]
func (h *CategoryHandler) CreateCategory(c *gin.Context) {
	var req dto.CreateCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperrors.Validation(err.Error()))
		return
	}

	res, err := h.svc.CreateCategory(c.Request.Context(), req)
	if err != nil {
		response.Error(c, err)
		return
	}

	response.Success(c, http.StatusCreated, res)
}

// GetCategory godoc
// @Summary      Get category by ID or slug
// @Description  The path segment is treated as a UUID if it parses as one, otherwise as a slug.
// @Tags         categories
// @Produce      json
// @Param        id   path      string  true  "Category ID or slug"
// @Success      200  {object}  dto.CategoryResponse
// @Failure      404  {object}  response.ErrorResponse
// @Router       /categories/{id} [get]
func (h *CategoryHandler) GetCategory(c *gin.Context) {
	param := c.Param("id")
	var (
		res dto.CategoryResponse
		err error
	)
	if id, perr := uuid.Parse(param); perr == nil {
		res, err = h.svc.GetCategory(c.Request.Context(), id)
	} else {
		res, err = h.svc.GetCategoryBySlug(c.Request.Context(), param)
	}
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, res)
}

// ListCategories godoc
// @Summary      List / search categories
// @Tags         categories
// @Produce      json
// @Param        q    query     string  false  "Search name or slug (ILIKE %q%)"
// @Success      200  {array}   dto.CategoryResponse
// @Router       /categories [get]
func (h *CategoryHandler) ListCategories(c *gin.Context) {
	filter := dto.CategoryListFilter{Q: c.Query("q")}
	res, err := h.svc.ListCategories(c.Request.Context(), filter)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, res)
}

// UpdateCategory godoc
// @Summary      Update a category
// @Tags         categories
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        id      path      string                   true "Category ID"
// @Param        request body      dto.UpdateCategoryRequest true "Update category payload"
// @Success      200     {object}  dto.CategoryResponse
// @Router       /categories/{id} [patch]
func (h *CategoryHandler) UpdateCategory(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, apperrors.Validation("invalid category id"))
		return
	}

	var req dto.UpdateCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperrors.Validation(err.Error()))
		return
	}

	res, err := h.svc.UpdateCategory(c.Request.Context(), id, req)
	if err != nil {
		response.Error(c, err)
		return
	}

	response.Success(c, http.StatusOK, res)
}

// DeleteCategory godoc
// @Summary      Soft-delete a category
// @Tags         categories
// @Security     BearerAuth
// @Param        id   path      string  true "Category ID"
// @Success      204
// @Router       /categories/{id} [delete]
func (h *CategoryHandler) DeleteCategory(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, apperrors.Validation("invalid category id"))
		return
	}

	if err := h.svc.DeleteCategory(c.Request.Context(), id); err != nil {
		response.Error(c, err)
		return
	}

	c.Status(http.StatusNoContent)
}
