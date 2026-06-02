package service

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	branchSvc "github.com/octguy/bakerio/backend/internal/branch/service"
	"github.com/octguy/bakerio/backend/internal/order/dto"
	"github.com/octguy/bakerio/backend/internal/order/repository"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
	"github.com/octguy/bakerio/backend/pkg/pagination"
)

// Permission strings used here. Customer/manager seed grants come from
// migration 10; super_admin is covered by *:*:all (wildcard match in
// LoadPermissions middleware).
const (
	permViewAll    = "order:view:all" // not currently seeded — wildcard covers admin
	permViewBranch = "order:view:branch"
	permViewOwn    = "order:view:own"
	permWildcard   = "*:*:all"
)

// QueryService is the read side of the order module — GET /orders and
// GET /orders/:id. Visibility is permission-scoped:
//
//   - super_admin (has *:*:all): all orders, all branches.
//   - branch_manager / branch_staff (has order:view:branch): scoped to their
//     branch (looked up via MembershipService). Any branch_id in the query
//     string is overridden by the caller's own.
//   - customer (has order:view:own): only their own orders. user_id query
//     param is overridden by the caller's id.
type QueryService interface {
	GetOrder(ctx context.Context, callerID uuid.UUID, perms []string, id uuid.UUID) (dto.OrderResponse, error)
	ListOrders(ctx context.Context, callerID uuid.UUID, perms []string, filter dto.OrderListFilter, p pagination.Params) (dto.OrderListResponse, error)
}

type queryService struct {
	orders     repository.OrderRepository
	membership branchSvc.MembershipService
}

func NewQueryService(orders repository.OrderRepository, m branchSvc.MembershipService) QueryService {
	return &queryService{orders: orders, membership: m}
}

func (s *queryService) GetOrder(ctx context.Context, callerID uuid.UUID, perms []string, id uuid.UUID) (dto.OrderResponse, error) {
	order, err := s.orders.GetOrderByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return dto.OrderResponse{}, apperrors.NotFound("order not found")
		}
		return dto.OrderResponse{}, apperrors.Internal("failed to read order", err)
	}

	// Authorization. Wildcard always passes. Branch-scoped: order's branch
	// must match the caller's. Own-scoped: order's user must match caller.
	allowed := false
	switch {
	case hasPerm(perms, permWildcard), hasPerm(perms, permViewAll):
		allowed = true
	case hasPerm(perms, permViewBranch):
		bid, err := s.callerBranch(ctx, callerID)
		if err != nil {
			return dto.OrderResponse{}, err
		}
		allowed = bid != nil && *bid == order.BranchID
	case hasPerm(perms, permViewOwn):
		allowed = order.UserID == callerID
	}
	if !allowed {
		// 404 (not 403) — don't tell the caller this order exists if they
		// can't see it. Standard "no enumeration" behavior.
		return dto.OrderResponse{}, apperrors.NotFound("order not found")
	}

	items, err := s.orders.ListItemsByOrderID(ctx, order.ID)
	if err != nil {
		return dto.OrderResponse{}, apperrors.Internal("failed to load items", err)
	}
	// buildOrderResponse (defined in checkout_service.go) wants []*OrderItem;
	// ListItemsByOrderID returns []OrderItem. Slice of refs into the local
	// slice avoids a copy.
	itemPtrs := make([]*domain.OrderItem, len(items))
	for i := range items {
		itemPtrs[i] = &items[i]
	}
	return buildOrderResponse(order, itemPtrs), nil
}

func (s *queryService) ListOrders(ctx context.Context, callerID uuid.UUID, perms []string, filter dto.OrderListFilter, p pagination.Params) (dto.OrderListResponse, error) {
	// Auto-scope the filter based on what the caller is allowed to see.
	// Order matters: wildcard short-circuits everything; branch overrides
	// any client-supplied branch_id; customer overrides user_id.
	switch {
	case hasPerm(perms, permWildcard), hasPerm(perms, permViewAll):
		// No scope tightening.
	case hasPerm(perms, permViewBranch):
		bid, err := s.callerBranch(ctx, callerID)
		if err != nil {
			return dto.OrderListResponse{}, err
		}
		if bid == nil {
			// Manager without a branch membership — no orders to show.
			return dto.OrderListResponse{
				Items: []dto.OrderSummary{},
				Meta:  pagination.NewMeta(p, 0),
			}, nil
		}
		filter.BranchID = bid // ignore any branch_id the client passed
	case hasPerm(perms, permViewOwn):
		uid := callerID
		filter.UserID = &uid // ignore any user_id the client passed
	default:
		return dto.OrderListResponse{}, apperrors.Forbidden("no order:view permission")
	}

	total, err := s.orders.CountOrders(ctx, filter)
	if err != nil {
		return dto.OrderListResponse{}, apperrors.Internal("failed to count orders", err)
	}
	items, err := s.orders.ListOrders(ctx, filter, p.Size, p.Offset())
	if err != nil {
		return dto.OrderListResponse{}, apperrors.Internal("failed to list orders", err)
	}
	return dto.OrderListResponse{
		Items: items,
		Meta:  pagination.NewMeta(p, total),
	}, nil
}

// callerBranch returns the caller's assigned branch_id via MembershipService.
// Returns (nil, nil) when the caller has no membership — handler interprets
// that as "no orders visible" rather than a hard error.
func (s *queryService) callerBranch(ctx context.Context, callerID uuid.UUID) (*uuid.UUID, error) {
	m, err := s.membership.GetMembership(ctx, callerID)
	if err != nil {
		var apperr *apperrors.AppError
		if errors.As(err, &apperr) && apperr.Code == apperrors.CodeNotFound {
			return nil, nil
		}
		return nil, apperrors.Internal("failed to load membership", err)
	}
	return &m.BranchID, nil
}

func hasPerm(perms []string, want string) bool {
	for _, p := range perms {
		if p == want {
			return true
		}
	}
	return false
}
