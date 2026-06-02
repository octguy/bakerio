package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/octguy/bakerio/backend/internal/order/dto"
	"github.com/octguy/bakerio/backend/internal/order/service"
	"github.com/octguy/bakerio/backend/internal/platform/middleware"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
	"github.com/octguy/bakerio/backend/internal/shared/authcontext"
	"github.com/octguy/bakerio/backend/internal/shared/response"
	"github.com/octguy/bakerio/backend/pkg/pagination"
)

type QueryHandler struct {
	svc service.QueryService
}

func NewQueryHandler(svc service.QueryService) *QueryHandler {
	return &QueryHandler{svc: svc}
}

func (h *QueryHandler) RegisterRoutes(protected *gin.RouterGroup) {
	// Any of the three view perms gets you here — the service decides which
	// scope to apply. Super_admin passes via the *:*:all wildcard.
	g := protected.Group("/orders", middleware.RequireAnyPermission(
		"order:view:own",
		"order:view:branch",
	))
	g.GET("", h.List)
	g.GET("/:id", h.GetByID)
}

// List godoc
// @Summary      List orders (scoped by caller's role)
// @Description  Customer → own orders only. branch_manager/branch_staff → orders at their branch. super_admin → all. Filters: code (ILIKE), branch_id, user_id, from / to (ISO8601 datetimes), page, size.
// @Tags         orders
// @Security     BearerAuth
// @Produce      json
// @Param        code       query     string  false  "Partial match on order code"
// @Param        user_id    query     string  false  "Filter by user (admin only — ignored otherwise)"
// @Param        branch_id  query     string  false  "Filter by branch (admin only — branch staff are forced to own branch)"
// @Param        from       query     string  false  "Placed at or after (RFC3339)"
// @Param        to         query     string  false  "Placed before (RFC3339, exclusive)"
// @Param        page       query     int     false  "Page (default 1)"
// @Param        size       query     int     false  "Page size (default 20, max 100)"
// @Success      200        {object}  dto.OrderListResponse
// @Failure      403        {object}  response.ErrorResponse
// @Failure      422        {object}  response.ErrorResponse
// @Router       /orders [get]
func (h *QueryHandler) List(c *gin.Context) {
	userID, ok := authcontext.CallerID(c.Request.Context())
	if !ok {
		response.Error(c, apperrors.Unauthorized("caller identity missing"))
		return
	}
	raw, _ := c.Get(middleware.PermissionsKey)
	perms, _ := raw.([]string)

	filter, ok := buildOrderFilter(c)
	if !ok {
		return // buildOrderFilter wrote the 422 already
	}

	res, err := h.svc.ListOrders(c.Request.Context(), userID, perms, filter, pagination.FromQuery(c))
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, res)
}

// GetByID godoc
// @Summary      Get an order by id (scoped by caller's role)
// @Description  Returns 404 if the order doesn't exist OR the caller isn't allowed to see it (no enumeration).
// @Tags         orders
// @Security     BearerAuth
// @Produce      json
// @Param        id   path      string  true  "Order ID"
// @Success      200  {object}  dto.OrderResponse
// @Failure      404  {object}  response.ErrorResponse
// @Router       /orders/{id} [get]
func (h *QueryHandler) GetByID(c *gin.Context) {
	userID, ok := authcontext.CallerID(c.Request.Context())
	if !ok {
		response.Error(c, apperrors.Unauthorized("caller identity missing"))
		return
	}
	raw, _ := c.Get(middleware.PermissionsKey)
	perms, _ := raw.([]string)

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, apperrors.Validation("invalid order id"))
		return
	}
	res, err := h.svc.GetOrder(c.Request.Context(), userID, perms, id)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, res)
}

// buildOrderFilter parses ?code=&user_id=&branch_id=&from=&to= into a filter.
// Writes a 422 + returns ok=false if any uuid/date param is malformed.
func buildOrderFilter(c *gin.Context) (dto.OrderListFilter, bool) {
	f := dto.OrderListFilter{Code: c.Query("code")}
	if raw := c.Query("user_id"); raw != "" {
		id, err := uuid.Parse(raw)
		if err != nil {
			response.Error(c, apperrors.Validation("invalid user_id"))
			return f, false
		}
		f.UserID = &id
	}
	if raw := c.Query("branch_id"); raw != "" {
		id, err := uuid.Parse(raw)
		if err != nil {
			response.Error(c, apperrors.Validation("invalid branch_id"))
			return f, false
		}
		f.BranchID = &id
	}
	if raw := c.Query("from"); raw != "" {
		t, err := time.Parse(time.RFC3339, raw)
		if err != nil {
			response.Error(c, apperrors.Validation("invalid `from` — must be RFC3339"))
			return f, false
		}
		f.From = &t
	}
	if raw := c.Query("to"); raw != "" {
		t, err := time.Parse(time.RFC3339, raw)
		if err != nil {
			response.Error(c, apperrors.Validation("invalid `to` — must be RFC3339"))
			return f, false
		}
		f.To = &t
	}
	return f, true
}
