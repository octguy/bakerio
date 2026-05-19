package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/octguy/bakerio/backend/internal/platform/middleware"
	"github.com/octguy/bakerio/backend/internal/procurement/dto"
	"github.com/octguy/bakerio/backend/internal/procurement/service"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
	"github.com/octguy/bakerio/backend/internal/shared/response"
	"github.com/octguy/bakerio/backend/internal/shared/scope"
)

type ProcurementHandler struct {
	svc service.ProcurementService
}

func NewProcurementHandler(svc service.ProcurementService) *ProcurementHandler {
	return &ProcurementHandler{svc: svc}
}

func (h *ProcurementHandler) RegisterRoutes(protected *gin.RouterGroup) {
	g := protected.Group("/procurement")
	{
		g.GET("/orders", middleware.RequirePermission("procurement:view:branch"), h.ListPOs)
		g.GET("/orders/:id", middleware.RequirePermission("procurement:view:branch"), h.GetPO)
		g.POST("/orders", middleware.RequirePermission("procurement:manage:branch"), h.CreatePO)
		g.PATCH("/orders/:id/status", middleware.RequireAnyPermission("procurement:manage:branch", "procurement:approve:branch"), h.UpdateStatus)
	}
}

// CreatePO godoc
// @Summary      Create a purchase order
// @Tags         procurement
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        request body      dto.CreatePORequest true "Create PO payload"
// @Success      201     {object}  dto.POResponse
// @Router       /procurement/orders [post]
func (h *ProcurementHandler) CreatePO(c *gin.Context) {
	var req dto.CreatePORequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperrors.Validation(err.Error()))
		return
	}

	res, err := h.svc.CreatePO(c.Request.Context(), req)
	if err != nil {
		response.Error(c, err)
		return
	}

	response.Success(c, http.StatusCreated, res)
}

// GetPO godoc
// @Summary      Get purchase order by ID
// @Tags         procurement
// @Security     BearerAuth
// @Produce      json
// @Param        id   path      string  true "PO ID"
// @Success      200  {object}  dto.POResponse
// @Router       /procurement/orders/{id} [get]
func (h *ProcurementHandler) GetPO(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, apperrors.Validation("invalid order id"))
		return
	}

	res, err := h.svc.GetPO(c.Request.Context(), id)
	if err != nil {
		response.Error(c, err)
		return
	}

	response.Success(c, http.StatusOK, res)
}

// ListPOs godoc
// @Summary      List branch purchase orders
// @Tags         procurement
// @Security     BearerAuth
// @Produce      json
// @Success      200  {array}   dto.POResponse
// @Router       /procurement/orders [get]
func (h *ProcurementHandler) ListPOs(c *gin.Context) {
	s, err := scope.Resolve(c, "procurement:view:all")
	if err != nil {
		response.Error(c, err)
		return
	}

	var branchID *uuid.UUID
	if !s.All {
		branchID = s.BranchID
	}

	res, err := h.svc.ListPOs(c.Request.Context(), branchID)
	if err != nil {
		response.Error(c, err)
		return
	}

	response.Success(c, http.StatusOK, res)
}

// UpdateStatus godoc
// @Summary      Update PO status (Transition)
// @Tags         procurement
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        id      path      string                   true "PO ID"
// @Param        request body      dto.UpdatePOStatusRequest true "Update status payload"
// @Success      200     {object}  dto.POResponse
// @Router       /procurement/orders/{id}/status [patch]
func (h *ProcurementHandler) UpdateStatus(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, apperrors.Validation("invalid order id"))
		return
	}

	var req dto.UpdatePOStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperrors.Validation(err.Error()))
		return
	}

	// Permission check for specific statuses
	if req.Status == domain.POStatusApproved || req.Status == domain.POStatusRejected {
		// Need procurement:approve:branch
		raw, _ := c.Get(middleware.PermissionsKey)
		perms, _ := raw.([]string)
		hasPerm := false
		for _, p := range perms {
			if p == "procurement:approve:branch" {
				hasPerm = true
				break
			}
		}
		if !hasPerm {
			response.Error(c, apperrors.Forbidden("missing approval permission"))
			return
		}
	}

	res, err := h.svc.UpdateStatus(c.Request.Context(), id, req.Status)
	if err != nil {
		response.Error(c, err)
		return
	}

	response.Success(c, http.StatusOK, res)
}
