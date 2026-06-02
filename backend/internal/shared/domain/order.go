package domain

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// Order is one row in orders.orders. Money fields are decimal.Decimal storing
// raw VND (cosmetic .00). Shipping is snapshotted; no FK to any address row.
type Order struct {
	ID                uuid.UUID
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
	PlacedAt          time.Time
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

// OrderItem is one row in orders.order_items. name_snap + unit_price_snap
// are what the invoice prints; product_id is a soft reference for analytics.
type OrderItem struct {
	ID            uuid.UUID
	OrderID       uuid.UUID
	ProductID     uuid.UUID
	NameSnap      string
	UnitPriceSnap decimal.Decimal
	Quantity      int32
	LineTotal     decimal.Decimal
}
