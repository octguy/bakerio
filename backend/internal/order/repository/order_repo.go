package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"

	ordersdb "github.com/octguy/bakerio/backend/db/sqlc/orders"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
	"github.com/octguy/bakerio/backend/pkg/txmanager"
)

// OrderRepository is the write side for orders.{orders, order_items,
// order_events}. Every create method participates in the caller's tx via
// pkg/txmanager — confirm wraps the whole flow in WithTx so the order rows,
// item rows, initial event, and stock decrements either all commit or none.
type OrderRepository interface {
	CreateOrder(ctx context.Context, p CreateOrderParams) (*domain.Order, error)
	CreateOrderItem(ctx context.Context, p CreateOrderItemParams) (*domain.OrderItem, error)
	CreateInitialEvent(ctx context.Context, orderID uuid.UUID, actorID *uuid.UUID) (*domain.OrderEvent, error)

	GetOrderByID(ctx context.Context, id uuid.UUID) (*domain.Order, error)
	ListItemsByOrderID(ctx context.Context, orderID uuid.UUID) ([]domain.OrderItem, error)
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
	db *ordersdb.Queries
}

func NewOrderRepository(db *ordersdb.Queries) OrderRepository {
	return &orderRepo{db: db}
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

func (r *orderRepo) CreateInitialEvent(ctx context.Context, orderID uuid.UUID, actorID *uuid.UUID) (*domain.OrderEvent, error) {
	// The initial event has from_status=NULL, to_status='pending'.
	row, err := r.queries(ctx).CreateOrderEvent(ctx, ordersdb.CreateOrderEventParams{
		OrderID:    orderID,
		FromStatus: nil,
		ToStatus:   "pending",
		ActorID:    actorID,
		Note:       nil,
	})
	if err != nil {
		return nil, err
	}
	return orderEventRowToEntity(row), nil
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

func orderRowToEntity(row ordersdb.OrdersOrder) *domain.Order {
	return &domain.Order{
		ID:                row.ID,
		Code:              row.Code,
		UserID:            row.UserID,
		BranchID:          row.BranchID,
		Status:            row.Status,
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

func orderEventRowToEntity(row ordersdb.OrdersOrderEvent) *domain.OrderEvent {
	return &domain.OrderEvent{
		ID:         row.ID,
		OrderID:    row.OrderID,
		FromStatus: row.FromStatus,
		ToStatus:   row.ToStatus,
		ActorID:    row.ActorID,
		Note:       row.Note,
		CreatedAt:  row.CreatedAt,
	}
}
