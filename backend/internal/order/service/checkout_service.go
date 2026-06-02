package service

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/shopspring/decimal"

	branchSvc "github.com/octguy/bakerio/backend/internal/branch/service"
	"github.com/octguy/bakerio/backend/internal/order/dto"
	"github.com/octguy/bakerio/backend/internal/order/repository"
	productdto "github.com/octguy/bakerio/backend/internal/product/dto"
	productrepo "github.com/octguy/bakerio/backend/internal/product/repository"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
	"github.com/octguy/bakerio/backend/pkg/txmanager"
)

// SessionTTL — 10 min, per the agreed checkout flow. Long enough to enter
// contact info; short enough that stock staleness is bounded.
const SessionTTL = 10 * time.Minute

// CheckoutService owns POST /orders/select-branch and POST /orders/confirm.
// SelectBranch re-verifies eligibility (via the branch router) and freezes
// the quote into a Redis session. Confirm pops the session and runs the
// atomic decrement + insert inside one DB tx.
type CheckoutService interface {
	SelectBranch(ctx context.Context, userID uuid.UUID, req dto.SelectBranchRequest) (dto.SelectBranchResponse, error)
	Confirm(ctx context.Context, userID, sessionID uuid.UUID) (dto.OrderResponse, error)
}

// Catalog is the order module's view of the product service. Same pattern
// as cart.Catalog — narrow interface that the concrete product service
// satisfies. Importing productrepo.BranchStockRow keeps the types aligned
// across modules (no transcoding inside checkout).
//
// ReadBranchStock is a non-locking informational read; the atomic UPDATE
// in DecrementBranchStock is what actually enforces the stock invariant.
// See documents/business/order-module.md if the lock semantics ever change.
type Catalog interface {
	GetActiveProducts(ctx context.Context, ids []uuid.UUID) ([]productdto.ProductResponse, error)
	ReadBranchStock(ctx context.Context, branchID uuid.UUID, productIDs []uuid.UUID) ([]productrepo.BranchStockRow, error)
	DecrementBranchStock(ctx context.Context, branchID, productID uuid.UUID, qty int32) (int64, error)
}

type checkoutService struct {
	router  branchSvc.BranchRouter
	catalog Catalog
	store   CheckoutSessionStore
	orders  repository.OrderRepository
	tx      *txmanager.TxManager
}

func NewCheckoutService(
	router branchSvc.BranchRouter,
	catalog Catalog,
	store CheckoutSessionStore,
	orders repository.OrderRepository,
	tx *txmanager.TxManager,
) CheckoutService {
	return &checkoutService{
		router:  router,
		catalog: catalog,
		store:   store,
		orders:  orders,
		tx:      tx,
	}
}

// SelectBranch — see file header for the flow.
func (s *checkoutService) SelectBranch(ctx context.Context, userID uuid.UUID, req dto.SelectBranchRequest) (dto.SelectBranchResponse, error) {
	// 1. Merge duplicate items so the router gets clean input.
	items := mergeSelectItems(req.Items)
	productIDs := make([]uuid.UUID, len(items))
	for i, it := range items {
		productIDs[i] = it.ProductID
	}

	// 2. Re-verify eligibility through the router. Catches very-fast staleness
	//    between the find-branches preview and this call.
	routerItems := make([]branchSvc.RequestedItem, len(items))
	for i, it := range items {
		routerItems[i] = branchSvc.RequestedItem{
			ProductID: it.ProductID,
			Quantity:  it.Quantity,
		}
	}
	out, err := s.router.FindBranches(ctx, branchSvc.FindBranchesInput{
		Items:   routerItems,
		ShipLat: req.ShippingLatitude,
		ShipLng: req.ShippingLongitude,
	})
	if err != nil {
		return dto.SelectBranchResponse{}, apperrors.Internal("routing failed", err)
	}
	if len(out.Missing) > 0 {
		// Stock shifted under us; bounce back to find-branches.
		return dto.SelectBranchResponse{}, apperrors.StockConflict(
			"cart can no longer be fulfilled — please refresh branches",
			missingToConflicts(out.Missing),
		)
	}

	// 3. Picked branch must still be in the eligible set.
	var picked *branchSvc.BranchOption
	for i := range out.Options {
		if out.Options[i].BranchID == req.BranchID {
			picked = &out.Options[i]
			break
		}
	}
	if picked == nil {
		return dto.SelectBranchResponse{}, apperrors.Conflict("chosen branch is no longer eligible — please refresh branches")
	}

	// 4. Snapshot product names + prices into the session so confirm doesn't
	//    re-query products (and so a mid-session price/name change can't
	//    surprise the user).
	products, err := s.catalog.GetActiveProducts(ctx, productIDs)
	if err != nil {
		return dto.SelectBranchResponse{}, apperrors.Internal("failed to load products", err)
	}
	productByID := make(map[uuid.UUID]productdto.ProductResponse, len(products))
	for _, p := range products {
		productByID[p.ID] = p
	}
	for _, it := range items {
		if _, ok := productByID[it.ProductID]; !ok {
			return dto.SelectBranchResponse{}, apperrors.StockConflict("a product became unavailable — please refresh", []dto.StockConflictItem{{ProductID: it.ProductID, Requested: it.Quantity, MaxAvailable: 0}})
		}
	}

	sessionItems := make([]CheckoutSessionItem, len(items))
	quotedItems := make([]dto.SelectBranchItemQuoted, len(items))
	for i, it := range items {
		p := productByID[it.ProductID]
		line := p.Price.Mul(decimal.NewFromInt32(it.Quantity))
		sessionItems[i] = CheckoutSessionItem{
			ProductID: it.ProductID,
			Name:      p.Name,
			UnitPrice: p.Price,
			Quantity:  it.Quantity,
			LineTotal: line,
		}
		quotedItems[i] = dto.SelectBranchItemQuoted{
			ProductID: it.ProductID,
			Name:      p.Name,
			UnitPrice: p.Price,
			Quantity:  it.Quantity,
			LineTotal: line,
		}
	}

	// 5. Build + save session.
	now := time.Now()
	expires := now.Add(SessionTTL)
	session := CheckoutSession{
		SessionID:         uuid.New(),
		UserID:            userID,
		BranchID:          picked.BranchID,
		BranchName:        picked.Name,
		Items:             sessionItems,
		Subtotal:          out.Subtotal,
		ShippingFee:       picked.ShippingFee,
		Total:             picked.Total,
		ShippingAddress:   req.ShippingAddress,
		ShippingLatitude:  req.ShippingLatitude,
		ShippingLongitude: req.ShippingLongitude,
		ContactPhone:      req.ContactPhone,
		Note:              req.Note,
		DistanceKm:        picked.DistanceKm,
		RoutingReason:     picked.RoutingNote,
		CreatedAt:         now,
		ExpiresAt:         expires,
	}
	if err := s.store.Save(ctx, session, SessionTTL); err != nil {
		return dto.SelectBranchResponse{}, apperrors.Internal("failed to store session", err)
	}

	return dto.SelectBranchResponse{
		SessionID:   session.SessionID,
		BranchID:    session.BranchID,
		BranchName:  session.BranchName,
		Subtotal:    session.Subtotal,
		ShippingFee: session.ShippingFee,
		Total:       session.Total,
		DistanceKm:  session.DistanceKm,
		Items:       quotedItems,
		ExpiresAt:   expires,
		TTLSeconds:  int(SessionTTL.Seconds()),
	}, nil
}

// Confirm — pops the session (single-use), runs the atomic decrement +
// order insert inside one tx. Any failure rolls back EVERYTHING; the
// session is already gone so the client has to re-find-branches.
func (s *checkoutService) Confirm(ctx context.Context, userID, sessionID uuid.UUID) (dto.OrderResponse, error) {
	// 1. Atomic get + delete. Double-tap returns SESSION_EXPIRED.
	session, err := s.store.PopByID(ctx, sessionID)
	if err != nil {
		return dto.OrderResponse{}, apperrors.Internal("failed to read session", err)
	}
	if session == nil {
		return dto.OrderResponse{}, apperrors.Gone("checkout session expired or already used")
	}

	// 2. Session must belong to the caller. A leaked session_id from one
	//    user must not let another user confirm someone else's cart.
	if session.UserID != userID {
		return dto.OrderResponse{}, apperrors.Forbidden("session belongs to a different user")
	}

	productIDs := make([]uuid.UUID, len(session.Items))
	for i, it := range session.Items {
		productIDs[i] = it.ProductID
	}

	var order *domain.Order
	var items []*domain.OrderItem

	err = s.tx.WithTx(ctx, func(ctx context.Context) error {
		// 3a. Non-locking pre-check. The point is UX: build a complete list
		//     of stock conflicts in one shot so the customer doesn't have
		//     to retry to discover the next failing item. The atomic UPDATE
		//     in step 3c is the actual safety net — if the values shift
		//     between this read and the UPDATE, the WHERE clause catches it.
		stockRows, err := s.catalog.ReadBranchStock(ctx, session.BranchID, productIDs)
		if err != nil {
			return apperrors.Internal("failed to read stock", err)
		}
		stockByProduct := make(map[uuid.UUID]productrepo.BranchStockRow, len(stockRows))
		for _, row := range stockRows {
			stockByProduct[row.ProductID] = row
		}

		// 3b. Validate every item is present, active, and has enough stock.
		//     Build the conflict payload eagerly so the customer sees all
		//     issues at once (better UX than one-at-a-time).
		var conflicts []dto.StockConflictItem
		for _, it := range session.Items {
			row, ok := stockByProduct[it.ProductID]
			if !ok || !row.IsActive {
				conflicts = append(conflicts, dto.StockConflictItem{
					ProductID:    it.ProductID,
					Requested:    it.Quantity,
					MaxAvailable: 0,
				})
				continue
			}
			if row.Quantity < it.Quantity {
				conflicts = append(conflicts, dto.StockConflictItem{
					ProductID:    it.ProductID,
					Requested:    it.Quantity,
					MaxAvailable: row.Quantity,
				})
			}
		}
		if len(conflicts) > 0 {
			return apperrors.StockConflict("stock shifted while you were checking out", conflicts)
		}

		// 3c. Atomic decrement. The WHERE clause `quantity >= $3 AND is_active`
		//     is the actual race-condition guard: Postgres takes a row-level
		//     lock during the UPDATE, so two concurrent decrements serialize
		//     and the loser sees rows-affected=0. Step 3b's pre-check could
		//     have missed a race; this step never lies.
		for _, it := range session.Items {
			n, err := s.catalog.DecrementBranchStock(ctx, session.BranchID, it.ProductID, it.Quantity)
			if err != nil {
				return apperrors.Internal("failed to decrement stock", err)
			}
			if n == 0 {
				return apperrors.StockConflict("stock conflict during decrement (rare race)", []dto.StockConflictItem{{
					ProductID: it.ProductID, Requested: it.Quantity, MaxAvailable: 0,
				}})
			}
		}

		// 3d. Generate code + insert order. Retry on UNIQUE collision once
		//     — the alphabet is wide enough that two retries is effectively
		//     impossible at v1 scale.
		var routingReason *string
		if session.RoutingReason != "" {
			r := session.RoutingReason
			routingReason = &r
		}

		var ord *domain.Order
		for attempt := 0; attempt < 2; attempt++ {
			code, err := generateOrderCode(time.Now())
			if err != nil {
				return apperrors.Internal("failed to generate code", err)
			}
			ord, err = s.orders.CreateOrder(ctx, repository.CreateOrderParams{
				Code:              code,
				UserID:            userID,
				BranchID:          session.BranchID,
				Subtotal:          session.Subtotal,
				DiscountTotal:     decimal.Zero,
				ShippingFee:       session.ShippingFee,
				Total:             session.Total,
				ShippingAddress:   session.ShippingAddress,
				ShippingLatitude:  session.ShippingLatitude,
				ShippingLongitude: session.ShippingLongitude,
				ContactPhone:      session.ContactPhone,
				Note:              session.Note,
				RoutingReason:     routingReason,
			})
			if err == nil {
				break
			}
			// Naive retry on the UNIQUE constraint — sqlc returns a pgx
			// error which surfaces as a regular error here. A second
			// attempt with a fresh random suffix has effectively zero
			// chance of repeat collision; any other failure on retry is
			// propagated as Internal.
			if attempt == 1 {
				return apperrors.Internal("failed to create order", err)
			}
		}
		order = ord

		// 3e. Insert items.
		items = make([]*domain.OrderItem, len(session.Items))
		for i, it := range session.Items {
			oi, err := s.orders.CreateOrderItem(ctx, repository.CreateOrderItemParams{
				OrderID:       order.ID,
				ProductID:     it.ProductID,
				NameSnap:      it.Name,
				UnitPriceSnap: it.UnitPrice,
				Quantity:      it.Quantity,
				LineTotal:     it.LineTotal,
			})
			if err != nil {
				return apperrors.Internal("failed to create order item", err)
			}
			items[i] = oi
		}

		// 3f. Initial audit event (NULL → 'pending'), actor = customer.
		uid := userID
		if _, err := s.orders.CreateInitialEvent(ctx, order.ID, &uid); err != nil {
			return apperrors.Internal("failed to create order event", err)
		}
		return nil
	})
	if err != nil {
		// Surface conflict / gone / forbidden errors verbatim; wrap others.
		var apperr *apperrors.AppError
		if errors.As(err, &apperr) {
			return dto.OrderResponse{}, err
		}
		return dto.OrderResponse{}, apperrors.Internal("checkout tx failed", err)
	}

	return buildOrderResponse(order, items), nil
}

// ─────────────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────────────

// missingToConflicts maps the router's internal MissingItem (no JSON tags)
// to the order module's public StockConflictItem (snake_case JSON tags) so
// the error.details payload renders consistently with the rest of the API.
func missingToConflicts(in []branchSvc.MissingItem) []dto.StockConflictItem {
	out := make([]dto.StockConflictItem, len(in))
	for i, m := range in {
		out[i] = dto.StockConflictItem{
			ProductID:    m.ProductID,
			Name:         m.Name,
			Requested:    m.Requested,
			MaxAvailable: m.MaxAvailable,
		}
	}
	return out
}

// mergeSelectItems sums duplicate product_ids (same pattern as
// preview_service.mergeItems — order needs the same hygiene).
func mergeSelectItems(in []dto.SelectBranchItem) []dto.SelectBranchItem {
	idx := make(map[uuid.UUID]int, len(in))
	out := make([]dto.SelectBranchItem, 0, len(in))
	for _, it := range in {
		if pos, ok := idx[it.ProductID]; ok {
			out[pos].Quantity += it.Quantity
			continue
		}
		idx[it.ProductID] = len(out)
		out = append(out, it)
	}
	return out
}

func buildOrderResponse(o *domain.Order, items []*domain.OrderItem) dto.OrderResponse {
	resp := dto.OrderResponse{
		ID:                o.ID,
		Code:              o.Code,
		UserID:            o.UserID,
		BranchID:          o.BranchID,
		Status:            o.Status,
		Subtotal:          o.Subtotal,
		DiscountTotal:     o.DiscountTotal,
		ShippingFee:       o.ShippingFee,
		Total:             o.Total,
		ShippingAddress:   o.ShippingAddress,
		ShippingLatitude:  o.ShippingLatitude,
		ShippingLongitude: o.ShippingLongitude,
		ContactPhone:      o.ContactPhone,
		Note:              o.Note,
		RoutingReason:     o.RoutingReason,
		PlacedAt:          o.PlacedAt,
		Items:             make([]dto.OrderItemResponse, len(items)),
	}
	for i, it := range items {
		resp.Items[i] = dto.OrderItemResponse{
			ID:        it.ID,
			ProductID: it.ProductID,
			Name:      it.NameSnap,
			UnitPrice: it.UnitPriceSnap,
			Quantity:  it.Quantity,
			LineTotal: it.LineTotal,
		}
	}
	return resp
}

// unused import guard for pgx — kept in case future query paths need
// errors.Is(err, pgx.ErrNoRows) at this layer.
var _ = pgx.ErrNoRows
