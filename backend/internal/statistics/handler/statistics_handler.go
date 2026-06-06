package handler

import (
	"errors"
	"net/http"
	"slices"
	"time"

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

	// Time-series for the dashboard chart. Same scope rules as the per-branch
	// detail: super_admin any branch (or all); branch_manager own only.
	g.GET("/timeseries",
		middleware.RequireAnyPermission("*:*:all", "branch:manage:own"),
		h.GetTimeseries,
	)

	// Per-product time-series. Open to admin (*:*:all), product_manager
	// (product:manage:all), and branch_manager (branch:manage:own — forced
	// to own branch in the handler).
	g.GET("/products/:id/timeseries",
		middleware.RequireAnyPermission("*:*:all", "product:manage:all", "branch:manage:own"),
		h.GetProductTimeseries,
	)
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

// GetTimeseries godoc
// @Summary      Time-series of orders + revenue (chart-friendly)
// @Description  Returns one point per calendar-aligned bucket in
// @Description  Asia/Ho_Chi_Minh. Empty buckets are zero-filled. Granularity
// @Description  whitelist: day / week / month / year.
// @Description  Defaults when from/to omitted: last 30 d (day), 12 w (week),
// @Description  12 mo (month), 5 y (year).
// @Description  Scope: super_admin may target any branch via ?branch_id= or
// @Description  omit for all branches; branch_manager is forced to own branch.
// @Tags         statistics
// @Security     BearerAuth
// @Produce      json
// @Param        granularity  query     string  true   "day | week | month | year"
// @Param        from         query     string  false  "RFC3339 datetime. Default: 30 days back (day), 12 weeks back (week), 12 months back (month), 5 years back (year)."
// @Param        to           query     string  false  "RFC3339 datetime. Default: now."
// @Param        branch_id    query     string  false  "Branch UUID (admin only — ignored for branch_manager, who is forced to own branch)"
// @Success      200  {object}  dto.TimeseriesResponse
// @Failure      403  {object}  response.ErrorResponse
// @Failure      422  {object}  response.ErrorResponse
// @Router       /statistics/timeseries [get]
func (h *Handler) GetTimeseries(c *gin.Context) {
	q, ok := h.parseTimeseriesQuery(c, false /*allowAdminWideScope*/, true)
	if !ok {
		return
	}
	res, err := h.svc.GetTimeseries(c.Request.Context(), q)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, res)
}

// GetProductTimeseries godoc
// @Summary      Per-product time-series (units sold + revenue)
// @Description  Same calendar buckets as /statistics/timeseries but
// @Description  aggregated over orders.order_items filtered by product_id.
// @Description  Scope: super_admin + product_manager may target any branch
// @Description  via ?branch_id= (omit for all branches); branch_manager is
// @Description  forced to own branch.
// @Tags         statistics
// @Security     BearerAuth
// @Produce      json
// @Param        id           path      string  true   "Product UUID"
// @Param        granularity  query     string  true   "day | week | month | year"
// @Param        from         query     string  false  "RFC3339 datetime. Default: 30 days back (day), 12 weeks back (week), 12 months back (month), 5 years back (year)."
// @Param        to           query     string  false  "RFC3339 datetime. Default: now."
// @Param        branch_id    query     string  false  "Branch UUID. Admin + product_manager may target any branch; omit for all branches. Ignored for branch_manager (forced to own branch)."
// @Success      200  {object}  dto.ProductTimeseriesResponse
// @Failure      403  {object}  response.ErrorResponse
// @Failure      404  {object}  response.ErrorResponse
// @Failure      422  {object}  response.ErrorResponse
// @Router       /statistics/products/{id}/timeseries [get]
func (h *Handler) GetProductTimeseries(c *gin.Context) {
	productID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, apperrors.Validation("invalid product id"))
		return
	}
	// Admin OR product_manager may pass any branch_id; only plain
	// branch_manager (without those higher perms) gets force-scoped.
	q, ok := h.parseTimeseriesQuery(c, true /*allowAdminWideScope*/, true)
	if !ok {
		return
	}
	res, err := h.svc.GetProductTimeseries(c.Request.Context(), productID, q)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, res)
}

// parseTimeseriesQuery reads {granularity, from, to, branch_id} from the
// request and applies role-aware branch scoping. allowProductMgrWide=true
// means a holder of product:manage:all (without branch:manage:own being the
// only perm) can also send branch_id freely — used by the per-product
// endpoint. The returned ok=false case means an error was already written.
func (h *Handler) parseTimeseriesQuery(c *gin.Context, allowProductMgrWide bool, _ bool) (service.TimeseriesQuery, bool) {
	q := service.TimeseriesQuery{
		Granularity: c.Query("granularity"),
	}
	if v := c.Query("from"); v != "" {
		t, err := time.Parse(time.RFC3339, v)
		if err != nil {
			response.Error(c, apperrors.Validation("invalid `from` — must be RFC3339"))
			return q, false
		}
		q.From = &t
	}
	if v := c.Query("to"); v != "" {
		t, err := time.Parse(time.RFC3339, v)
		if err != nil {
			response.Error(c, apperrors.Validation("invalid `to` — must be RFC3339"))
			return q, false
		}
		q.To = &t
	}

	raw, _ := c.Get(middleware.PermissionsKey)
	perms, _ := raw.([]string)
	hasWildcard := slices.Contains(perms, "*:*:all")
	hasProductMgr := allowProductMgrWide && slices.Contains(perms, "product:manage:all")

	if hasWildcard || hasProductMgr {
		if v := c.Query("branch_id"); v != "" {
			bid, err := uuid.Parse(v)
			if err != nil {
				response.Error(c, apperrors.Validation("invalid branch_id"))
				return q, false
			}
			q.BranchID = &bid
		}
		return q, true
	}

	// branch_manager — force own branch, ignore any client value.
	callerID, ok := authcontext.CallerID(c.Request.Context())
	if !ok {
		response.Error(c, apperrors.Forbidden("caller identity missing"))
		return q, false
	}
	mb, err := h.membership.GetMembership(c.Request.Context(), callerID)
	if err != nil {
		var ae *apperrors.AppError
		if errors.As(err, &ae) && ae.Code == apperrors.CodeNotFound {
			response.Error(c, apperrors.Forbidden("you do not belong to any branch"))
			return q, false
		}
		response.Error(c, err)
		return q, false
	}
	bid := mb.BranchID
	q.BranchID = &bid
	return q, true
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
