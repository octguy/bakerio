package handler

import (
	"errors"
	"net/http"
	"slices"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	branchSvc "github.com/octguy/bakerio/backend/internal/branch/service"
	"github.com/octguy/bakerio/backend/internal/platform/middleware"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
	"github.com/octguy/bakerio/backend/internal/shared/authcontext"
	"github.com/octguy/bakerio/backend/internal/shared/response"
	_ "github.com/octguy/bakerio/backend/internal/statistics/dto" // make sure swag walks dto
	"github.com/octguy/bakerio/backend/internal/statistics/service"
	"github.com/octguy/bakerio/backend/pkg/pagination"
)

type Handler struct {
	svc        service.Service
	membership branchSvc.MembershipService
}

func NewHandler(svc service.Service, membership branchSvc.MembershipService) *Handler {
	return &Handler{svc: svc, membership: membership}
}

func (h *Handler) RegisterRoutes(protected *gin.RouterGroup) {
	g := protected.Group("/statistics")

	// Org-wide views: super_admin only (via *:*:all wildcard).
	g.GET("/overview", middleware.RequirePermission("*:*:all"), h.GetOverview)
	g.GET("/branches", middleware.RequirePermission("*:*:all"), h.ListBranches)

	// Per-branch detail: super_admin any branch; branch_manager only their own
	// (scope check in handler).
	g.GET("/branches/:id",
		middleware.RequireAnyPermission("*:*:all", "branch:manage:own"),
		h.GetBranchDetail,
	)

	// Per-product breakdown: super_admin (via wildcard) + product_manager
	// (via product:manage:all).
	g.GET("/products", middleware.RequirePermission("product:manage:all"), h.ListProducts)
}

// GetOverview godoc
// @Summary      Get organization-wide KPI bundle
// @Description  super_admin only (via the *:*:all wildcard). Returns totals
// @Description  for orders/revenue/customers/etc + tier distribution.
// @Tags         statistics
// @Security     BearerAuth
// @Produce      json
// @Success      200  {object}  dto.OverviewStats
// @Router       /statistics/overview [get]
func (h *Handler) GetOverview(c *gin.Context) {
	res, err := h.svc.GetOverview(c.Request.Context())
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, res)
}

// ListBranches godoc
// @Summary      List per-branch KPIs
// @Description  super_admin only. One row per branch with order_count,
// @Description  revenue, staff_count, active_products. Sorted by revenue desc.
// @Tags         statistics
// @Security     BearerAuth
// @Produce      json
// @Success      200  {object}  dto.BranchStatsResponse
// @Router       /statistics/branches [get]
func (h *Handler) ListBranches(c *gin.Context) {
	res, err := h.svc.ListBranchStats(c.Request.Context())
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, res)
}

// GetBranchDetail godoc
// @Summary      Get one branch's dashboard (calendar-aligned periods)
// @Description  Periods are today / this_week / this_month / all_time in
// @Description  Asia/Ho_Chi_Minh. super_admin can target any branch; a
// @Description  branch_manager only their own.
// @Tags         statistics
// @Security     BearerAuth
// @Produce      json
// @Param        id   path      string  true  "Branch ID"
// @Success      200  {object}  dto.BranchDetailStats
// @Failure      403  {object}  response.ErrorResponse
// @Failure      404  {object}  response.ErrorResponse
// @Router       /statistics/branches/{id} [get]
func (h *Handler) GetBranchDetail(c *gin.Context) {
	branchID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, apperrors.Validation("invalid branch id"))
		return
	}
	if err := h.ensureBranchScope(c, branchID); err != nil {
		response.Error(c, err)
		return
	}
	res, err := h.svc.GetBranchDetail(c.Request.Context(), branchID)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, res)
}

// ListProducts godoc
// @Summary      Paginated per-product breakdown
// @Description  super_admin + product_manager. Sorted by revenue desc.
// @Tags         statistics
// @Security     BearerAuth
// @Produce      json
// @Param        page  query     int  false  "Page (default 1)"
// @Param        size  query     int  false  "Page size (default 20)"
// @Success      200   {object}  dto.ProductStatsResponse
// @Router       /statistics/products [get]
func (h *Handler) ListProducts(c *gin.Context) {
	res, err := h.svc.ListProductStats(c.Request.Context(), pagination.FromQuery(c))
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, res)
}

// ensureBranchScope is the same pattern used by /branch/:id/products: the
// wildcard or *:view:all perm passes any branch; everyone else is forced to
// their own branch via MembershipService.
func (h *Handler) ensureBranchScope(c *gin.Context, target uuid.UUID) error {
	raw, _ := c.Get(middleware.PermissionsKey)
	perms, _ := raw.([]string)
	if slices.Contains(perms, "*:*:all") {
		return nil
	}

	callerID, ok := authcontext.CallerID(c.Request.Context())
	if !ok {
		return apperrors.Forbidden("caller identity missing")
	}
	mb, err := h.membership.GetMembership(c.Request.Context(), callerID)
	if err != nil {
		var ae *apperrors.AppError
		if errors.As(err, &ae) && ae.Code == apperrors.CodeNotFound {
			return apperrors.Forbidden("you do not belong to any branch")
		}
		return err
	}
	if mb.BranchID != target {
		return apperrors.Forbidden("you can only view statistics of your own branch")
	}
	return nil
}
