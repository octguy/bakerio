package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"

	ordersdb "github.com/octguy/bakerio/backend/db/sqlc/orders"
	"github.com/octguy/bakerio/backend/internal/order/dto"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
	"github.com/octguy/bakerio/backend/pkg/dbq"
	"github.com/octguy/bakerio/backend/pkg/txmanager"
)

// OrderRepository wraps both the static sqlc CRUD and the dynamic list query
// behind /orders. Creates participate in the caller's tx via pkg/txmanager
// so the order row + items insert atomically with the stock decrement.
type OrderRepository interface {
	CreateOrder(ctx context.Context, p CreateOrderParams) (*domain.Order, error)
	CreateOrderItem(ctx context.Context, p CreateOrderItemParams) (*domain.OrderItem, error)

	GetOrderByID(ctx context.Context, id uuid.UUID) (*domain.Order, error)
	ListItemsByOrderID(ctx context.Context, orderID uuid.UUID) ([]domain.OrderItem, error)
	ListItemsByOrderIDs(ctx context.Context, orderIDs []uuid.UUID) ([]domain.OrderItem, error)

	// ListOrders is the dynamic-filter list query for GET /orders. Joins
	// branch.branches for the summary's branch_name — accepted cross-schema
	// read exception, same as the user search repo.
	ListOrders(ctx context.Context, f dto.OrderListFilter, limit, offset int32) ([]dto.OrderSummary, error)
	CountOrders(ctx context.Context, f dto.OrderListFilter) (int64, error)
}

type CreateOrderParams struct {
	Code              string
	UserID            uuid.UUID
	BranchID          uuid.UUID
	Subtotal          decimal.Decimal
	DiscountTotal     decimal.Decimal
	ShippingFee       decimal.Decimal
	Total             decimal.Decimal
	ShippingAddress   string
	ShippingLatitude  *float64
	ShippingLongitude *float64
	ContactPhone      *string
	Note              *string
	RoutingReason     *string
}

type CreateOrderItemParams struct {
	OrderID       uuid.UUID
	ProductID     uuid.UUID
	NameSnap      string
	UnitPriceSnap decimal.Decimal
	Quantity      int32
	LineTotal     decimal.Decimal
}

type orderRepo struct {
	db   *ordersdb.Queries
	pool *pgxpool.Pool // for the dynamic list query
}

func NewOrderRepository(db *ordersdb.Queries, pool *pgxpool.Pool) OrderRepository {
	return &orderRepo{db: db, pool: pool}
}

func (r *orderRepo) queries(ctx context.Context) *ordersdb.Queries {
	if tx, ok := txmanager.Extract(ctx); ok {
		return r.db.WithTx(tx)
	}
	return r.db
}

func (r *orderRepo) CreateOrder(ctx context.Context, p CreateOrderParams) (*domain.Order, error) {
	row, err := r.queries(ctx).CreateOrder(ctx, ordersdb.CreateOrderParams{
		Code:              p.Code,
		UserID:            p.UserID,
		BranchID:          p.BranchID,
		Subtotal:          p.Subtotal,
		DiscountTotal:     p.DiscountTotal,
		ShippingFee:       p.ShippingFee,
		Total:             p.Total,
		ShippingAddress:   p.ShippingAddress,
		ShippingLatitude:  p.ShippingLatitude,
		ShippingLongitude: p.ShippingLongitude,
		ContactPhone:      p.ContactPhone,
		Note:              p.Note,
		RoutingReason:     p.RoutingReason,
	})
	if err != nil {
		return nil, err
	}
	return orderRowToEntity(row), nil
}

func (r *orderRepo) CreateOrderItem(ctx context.Context, p CreateOrderItemParams) (*domain.OrderItem, error) {
	row, err := r.queries(ctx).CreateOrderItem(ctx, ordersdb.CreateOrderItemParams{
		OrderID:       p.OrderID,
		ProductID:     p.ProductID,
		NameSnap:      p.NameSnap,
		UnitPriceSnap: p.UnitPriceSnap,
		Quantity:      p.Quantity,
		LineTotal:     p.LineTotal,
	})
	if err != nil {
		return nil, err
	}
	return orderItemRowToEntity(row), nil
}

func (r *orderRepo) GetOrderByID(ctx context.Context, id uuid.UUID) (*domain.Order, error) {
	row, err := r.queries(ctx).GetOrderByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return orderRowToEntity(row), nil
}

func (r *orderRepo) ListItemsByOrderID(ctx context.Context, orderID uuid.UUID) ([]domain.OrderItem, error) {
	rows, err := r.queries(ctx).ListOrderItemsByOrderID(ctx, orderID)
	if err != nil {
		return nil, err
	}
	out := make([]domain.OrderItem, len(rows))
	for i, row := range rows {
		out[i] = *orderItemRowToEntity(row)
	}
	return out, nil
}

func (r *orderRepo) ListItemsByOrderIDs(ctx context.Context, orderIDs []uuid.UUID) ([]domain.OrderItem, error) {
	if len(orderIDs) == 0 {
		return nil, nil
	}
	rows, err := r.queries(ctx).ListOrderItemsByOrderIDs(ctx, orderIDs)
	if err != nil {
		return nil, err
	}
	out := make([]domain.OrderItem, len(rows))
	for i, row := range rows {
		out[i] = *orderItemRowToEntity(row)
	}
	return out, nil
}

// orderListWhere builds the dynamic WHERE used by both ListOrders and
// CountOrders so paging is consistent.
func orderListWhere(f dto.OrderListFilter) *dbq.Where {
	w := dbq.NewWhere()
	if f.UserID != nil {
		n := w.Next()
		w.AddRaw(fmt.Sprintf("o.user_id = $%d", n), *f.UserID)
	}
	if f.BranchID != nil {
		n := w.Next()
		w.AddRaw(fmt.Sprintf("o.branch_id = $%d", n), *f.BranchID)
	}
	if f.Code != "" {
		n := w.Next()
		w.AddRaw(fmt.Sprintf("o.code ILIKE $%d", n), "%"+f.Code+"%")
	}
	if f.From != nil {
		n := w.Next()
		w.AddRaw(fmt.Sprintf("o.placed_at >= $%d", n), *f.From)
	}
	if f.To != nil {
		n := w.Next()
		w.AddRaw(fmt.Sprintf("o.placed_at < $%d", n), *f.To)
	}
	return w
}

func (r *orderRepo) ListOrders(ctx context.Context, f dto.OrderListFilter, limit, offset int32) ([]dto.OrderSummary, error) {
	w := orderListWhere(f)
	limitN := w.Next()
	offsetN := limitN + 1
	args := append(w.Args(), limit, offset)

	sql := `
		SELECT o.id, o.code, o.user_id, o.branch_id,
		       COALESCE(b.name, '') AS branch_name,
		       o.subtotal, o.shipping_fee, o.total,
		       o.shipping_address, o.placed_at
		FROM orders.orders o
		LEFT JOIN branch.branches b ON b.id = o.branch_id` +
		w.SQL() +
		fmt.Sprintf(`
		ORDER BY o.placed_at DESC
		LIMIT $%d OFFSET $%d`, limitN, offsetN)

	rows, err := r.pool.Query(ctx, sql, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]dto.OrderSummary, 0)
	for rows.Next() {
		var s dto.OrderSummary
		if err := rows.Scan(
			&s.ID, &s.Code, &s.UserID, &s.BranchID, &s.BranchName,
			&s.Subtotal, &s.ShippingFee, &s.Total,
			&s.ShippingAddress, &s.PlacedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

func (r *orderRepo) CountOrders(ctx context.Context, f dto.OrderListFilter) (int64, error) {
	w := orderListWhere(f)
	sql := `SELECT COUNT(*) FROM orders.orders o` + w.SQL()
	var total int64
	if err := r.pool.QueryRow(ctx, sql, w.Args()...).Scan(&total); err != nil {
		return 0, err
	}
	return total, nil
}

func orderRowToEntity(row ordersdb.OrdersOrder) *domain.Order {
	return &domain.Order{
		ID:                row.ID,
		Code:              row.Code,
		UserID:            row.UserID,
		BranchID:          row.BranchID,
		Subtotal:          row.Subtotal,
		DiscountTotal:     row.DiscountTotal,
		ShippingFee:       row.ShippingFee,
		Total:             row.Total,
		ShippingAddress:   row.ShippingAddress,
		ShippingLatitude:  row.ShippingLatitude,
		ShippingLongitude: row.ShippingLongitude,
		ContactPhone:      row.ContactPhone,
		Note:              row.Note,
		RoutingReason:     row.RoutingReason,
		PlacedAt:          row.PlacedAt,
		CreatedAt:         row.CreatedAt,
		UpdatedAt:         row.UpdatedAt,
	}
}

func orderItemRowToEntity(row ordersdb.OrdersOrderItem) *domain.OrderItem {
	return &domain.OrderItem{
		ID:            row.ID,
		OrderID:       row.OrderID,
		ProductID:     row.ProductID,
		NameSnap:      row.NameSnap,
		UnitPriceSnap: row.UnitPriceSnap,
		Quantity:      row.Quantity,
		LineTotal:     row.LineTotal,
	}
}
