package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/octguy/bakerio/backend/internal/branch/dto"
	"github.com/octguy/bakerio/backend/internal/branch/service"
	"github.com/octguy/bakerio/backend/internal/platform/middleware"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
	"github.com/octguy/bakerio/backend/internal/shared/response"
	"github.com/octguy/bakerio/backend/pkg/pagination"
)

type BranchHandler struct {
	svc service.BranchService
}

func NewBranchHandler(svc service.BranchService) *BranchHandler {
	return &BranchHandler{svc: svc}
}

func (h *BranchHandler) RegisterRoutes(public, protected *gin.RouterGroup) {
	publicBranches := public.Group("/branch")
	publicBranches.GET("", h.GetBranchList)
	publicBranches.GET("/:id", h.GetBranchByID)

	g := protected.Group("/branch")
	g.POST("", middleware.RequirePermission("branch:manage:all"), h.CreateBranch)
	g.PATCH("/:id", middleware.RequirePermission("branch:manage:all"), h.UpdateBranch)
	g.PATCH("/:id/status", middleware.RequirePermission("branch:manage:all"), h.UpdateStatus)
}

// GetBranchList returns a paginated list of branches with optional filters.
// @Summary      List / search branches
// @Tags         branch
// @Produce      json
// @Param        q       query     string  false  "Search name or address (ILIKE %q%)"
// @Param        status  query     string  false  "Filter by exact status (e.g. active, inactive)"
// @Param        page    query     int     false  "Page (default 1)"
// @Param        size    query     int     false  "Page size (default 20, max 100)"
// @Success      200     {object}  dto.BranchListResponse
// @Router       /branch [get]
func (h *BranchHandler) GetBranchList(c *gin.Context) {
	filter := dto.BranchListFilter{
		Q:      c.Query("q"),
		Status: c.Query("status"),
	}
	res, err := h.svc.ListBranches(c.Request.Context(), filter, pagination.FromQuery(c))
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, res)
}

// GetBranchByID returns a branch by ID
// @Summary      Get branch by ID
// @Description  Retrieve a single branch by its UUID
// @Tags         branch
// @Produce      json
// @Param        id   path      string  true  "Branch ID"
// @Success      200  {object}  dto.BranchResponse
// @Failure      400  {object}  response.ErrorResponse
// @Failure      404  {object}  response.ErrorResponse
// @Router       /branch/{id} [get]
func (h *BranchHandler) GetBranchByID(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, apperrors.Validation("invalid branch id"))
		return
	}

	branch, err := h.svc.GetBranchByID(c.Request.Context(), id)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, branch)
}

// CreateBranch creates a new branch
// @Summary      Create branch
// @Description  Add a new branch to the system
// @Tags         branch
// @Accept       json
// @Produce      json
// @Param        request  body      dto.CreateBranchRequest  true  "Create branch request"
// @Security     BearerAuth
// @Success      201      {object}  dto.BranchResponse
// @Failure      400      {object}  response.ErrorResponse
// @Failure      422      {object}  response.ErrorResponse
// @Router       /branch [post]
func (h *BranchHandler) CreateBranch(c *gin.Context) {
	var req dto.CreateBranchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperrors.Validation(err.Error()))
		return
	}

	created, err := h.svc.CreateBranch(c.Request.Context(), req)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusCreated, created)
}

// UpdateBranch updates an existing branch
// @Summary      Update branch
// @Description  Update details of an existing branch
// @Tags         branch
// @Accept       json
// @Produce      json
// @Param        id       path      string                   true  "Branch ID"
// @Param        request  body      dto.UpdateBranchRequest  true  "Update branch request"
// @Security     BearerAuth
// @Success      200      {object}  dto.BranchResponse
// @Failure      400      {object}  response.ErrorResponse
// @Failure      404      {object}  response.ErrorResponse
// @Failure      422      {object}  response.ErrorResponse
// @Router       /branch/{id} [patch]
func (h *BranchHandler) UpdateBranch(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, apperrors.Validation("invalid branch id"))
		return
	}

	var req dto.UpdateBranchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperrors.Validation(err.Error()))
		return
	}

	updated, err := h.svc.UpdateBranch(c.Request.Context(), id, req)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, updated)
}

// UpdateStatus changes the status of a branch
// @Summary      Update branch status
// @Description  Activate or deactivate a branch
// @Tags         branch
// @Accept       json
// @Produce      json
// @Param        id       path      string                   true  "Branch ID"
// @Param        request  body      dto.UpdateStatusRequest  true  "Update status request"
// @Security     BearerAuth
// @Success      200
// @Failure      400      {object}  response.ErrorResponse
// @Failure      404      {object}  response.ErrorResponse
// @Failure      422      {object}  response.ErrorResponse
// @Router       /branch/{id}/status [patch]
func (h *BranchHandler) UpdateStatus(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, apperrors.Validation("invalid branch id"))
		return
	}

	var req dto.UpdateStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperrors.Validation(err.Error()))
		return
	}

	err = h.svc.UpdateBranchStatus(c.Request.Context(), id, req.Status)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, nil)
}
