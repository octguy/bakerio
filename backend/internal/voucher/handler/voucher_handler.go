package handler

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/octguy/bakerio/backend/internal/platform/middleware"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
	"github.com/octguy/bakerio/backend/internal/shared/authcontext"
	"github.com/octguy/bakerio/backend/internal/shared/response"
	"github.com/octguy/bakerio/backend/internal/voucher/dto"
	"github.com/octguy/bakerio/backend/internal/voucher/repository"
	"github.com/octguy/bakerio/backend/internal/voucher/service"
	"github.com/octguy/bakerio/backend/pkg/pagination"
)

type Handler struct {
	svc service.Service
}

func NewHandler(svc service.Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) RegisterRoutes(protected *gin.RouterGroup) {
	g := protected.Group("/admin/vouchers", middleware.RequirePermission("voucher:manage:all"))
	g.POST("", h.Create)
	g.GET("", h.List)
	g.GET("/:id", h.GetByID)
	g.PATCH("/:id", h.Update)

	// Customer-facing — gated by voucher:apply:own (held by the customer role,
	// granted to super_admin via the wildcard).
	protected.GET("/vouchers", middleware.RequirePermission("voucher:apply:own"), h.ListAvailable)
}

// Create godoc
// @Summary      Create a voucher
// @Tags         vouchers
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        request body      dto.CreateVoucherRequest  true  "Voucher payload"
// @Success      201     {object}  dto.VoucherResponse
// @Failure      422     {object}  response.ErrorResponse
// @Router       /admin/vouchers [post]
func (h *Handler) Create(c *gin.Context) {
	var req dto.CreateVoucherRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperrors.Validation(err.Error()))
		return
	}
	if !req.ValidTo.After(req.ValidFrom) && !req.ValidTo.Equal(req.ValidFrom) {
		response.Error(c, apperrors.Validation("valid_to must be >= valid_from"))
		return
	}

	callerID, _ := authcontext.CallerID(c.Request.Context())
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	v, err := h.svc.Create(c.Request.Context(), repository.CreateVoucherParams{
		Code:            req.Code,
		DiscountPercent: req.DiscountPercent,
		MaxDiscount:     req.MaxDiscount,
		MinSubtotal:     req.MinSubtotal,
		ValidFrom:       req.ValidFrom,
		ValidTo:         req.ValidTo,
		IsActive:        isActive,
		CreatedBy:       optionalCallerID(callerID),
	})
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusCreated, dto.ToResponse(*v))
}

// List godoc
// @Summary      List vouchers
// @Tags         vouchers
// @Security     BearerAuth
// @Produce      json
// @Param        active  query     boolean  false  "Filter: true → active only, false → inactive only, omit → all"
// @Param        page    query     int      false  "Page (default 1)"
// @Param        size    query     int      false  "Page size (default 20)"
// @Success      200     {object}  dto.VoucherListResponse
// @Router       /admin/vouchers [get]
func (h *Handler) List(c *gin.Context) {
	var activeFilter *bool
	if v := c.Query("active"); v != "" {
		switch strings.ToLower(v) {
		case "true", "1":
			t := true
			activeFilter = &t
		case "false", "0":
			f := false
			activeFilter = &f
		default:
			response.Error(c, apperrors.Validation("active must be true or false"))
			return
		}
	}
	p := pagination.FromQuery(c)
	items, total, err := h.svc.List(c.Request.Context(), activeFilter, int32(p.Size), int32(p.Offset()))
	if err != nil {
		response.Error(c, err)
		return
	}
	out := make([]dto.VoucherResponse, len(items))
	for i, v := range items {
		out[i] = dto.ToResponse(v)
	}
	response.Success(c, http.StatusOK, dto.VoucherListResponse{Items: out, Meta: pagination.NewMeta(p, total)})
}

// GetByID godoc
// @Summary      Get a voucher
// @Tags         vouchers
// @Security     BearerAuth
// @Produce      json
// @Param        id   path      string  true  "Voucher ID"
// @Success      200  {object}  dto.VoucherResponse
// @Failure      404  {object}  response.ErrorResponse
// @Router       /admin/vouchers/{id} [get]
func (h *Handler) GetByID(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, apperrors.Validation("invalid voucher id"))
		return
	}
	v, err := h.svc.GetByID(c.Request.Context(), id)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, dto.ToResponse(*v))
}

// Update godoc
// @Summary      Patch a voucher
// @Description  Toggle is_active, edit window or discount. Omitted fields unchanged.
// @Tags         vouchers
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        id      path      string                    true  "Voucher ID"
// @Param        request body      dto.UpdateVoucherRequest  true  "Patch payload"
// @Success      200     {object}  dto.VoucherResponse
// @Failure      404     {object}  response.ErrorResponse
// @Router       /admin/vouchers/{id} [patch]
func (h *Handler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, apperrors.Validation("invalid voucher id"))
		return
	}
	var req dto.UpdateVoucherRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperrors.Validation(err.Error()))
		return
	}
	if req.DiscountPercent == nil && req.MaxDiscount == nil && req.MinSubtotal == nil &&
		req.ValidFrom == nil && req.ValidTo == nil && req.IsActive == nil {
		response.Error(c, apperrors.Validation("no fields to update"))
		return
	}

	callerID, _ := authcontext.CallerID(c.Request.Context())
	patch := repository.UpdateVoucherPatch{
		DiscountPercent: req.DiscountPercent,
		ValidFrom:       req.ValidFrom,
		ValidTo:         req.ValidTo,
		IsActive:        req.IsActive,
		UpdatedBy:       optionalCallerID(callerID),
	}
	if req.MaxDiscount != nil {
		v := req.MaxDiscount
		patch.MaxDiscount = &v
	}
	if req.MinSubtotal != nil {
		v := req.MinSubtotal
		patch.MinSubtotal = &v
	}

	v, err := h.svc.Update(c.Request.Context(), id, patch)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, dto.ToResponse(*v))
}

// ListAvailable godoc
// @Summary      List vouchers the caller can currently apply
// @Description  Returns active vouchers within their validity window that the
// @Description  authenticated user has not yet redeemed. Order: nearest expiry first.
// @Tags         vouchers
// @Security     BearerAuth
// @Produce      json
// @Param        page  query     int  false  "Page (default 1)"
// @Param        size  query     int  false  "Page size (default 20)"
// @Success      200   {object}  dto.PublicVoucherListResponse
// @Router       /vouchers [get]
func (h *Handler) ListAvailable(c *gin.Context) {
	userID, ok := authcontext.CallerID(c.Request.Context())
	if !ok {
		response.Error(c, apperrors.Unauthorized("caller identity missing"))
		return
	}
	p := pagination.FromQuery(c)
	items, total, err := h.svc.ListAvailableForUser(c.Request.Context(), userID, int32(p.Size), int32(p.Offset()))
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, dto.PublicVoucherListResponse{
		Items: items,
		Meta:  pagination.NewMeta(p, total),
	})
}

func optionalCallerID(id uuid.UUID) *uuid.UUID {
	if id == uuid.Nil {
		return nil
	}
	return &id
}
