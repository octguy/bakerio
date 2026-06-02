package dto

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// ─────────────────────────────────────────────────────────────────────────────
// POST /orders/select-branch
//
// Caller has already run /orders/find-branches, picked a branch_id from the
// returned options, and now wants to lock that quote into a session before
// going to the confirm screen. Server re-verifies eligibility one more time
// (catches very-fast staleness), freezes the quote, stores in Redis with
// 10min TTL, returns session_id.
// ─────────────────────────────────────────────────────────────────────────────

type SelectBranchRequest struct {
	BranchID          uuid.UUID          `json:"branch_id"          binding:"required"`
	ShippingAddress   string             `json:"shipping_address"   binding:"required"`
	ShippingLatitude  *float64           `json:"shipping_latitude"  binding:"omitempty,latitude"`
	ShippingLongitude *float64           `json:"shipping_longitude" binding:"omitempty,longitude"`
	ContactPhone      *string            `json:"contact_phone"      binding:"omitempty,max=20"`
	Note              *string            `json:"note"               binding:"omitempty,max=500"`
	Items             []SelectBranchItem `json:"items"             binding:"required,min=1,dive"`
} // @name SelectBranchRequest

type SelectBranchItem struct {
	ProductID uuid.UUID `json:"product_id" binding:"required"`
	Quantity  int32     `json:"quantity"   binding:"required,min=1,max=99"`
} // @name SelectBranchItem

// SelectBranchResponse is the frozen quote handed to the client. ExpiresAt
// drives the countdown timer in the UI; ConfirmEndpoint is informational.
type SelectBranchResponse struct {
	SessionID   uuid.UUID                `json:"session_id"`
	BranchID    uuid.UUID                `json:"branch_id"`
	BranchName  string                   `json:"branch_name"`
	Subtotal    decimal.Decimal          `json:"subtotal"`
	ShippingFee decimal.Decimal          `json:"shipping_fee"`
	Total       decimal.Decimal          `json:"total"`
	DistanceKm  *float64                 `json:"distance_km,omitempty"`
	Items       []SelectBranchItemQuoted `json:"items"`
	ExpiresAt   time.Time                `json:"expires_at"`
	TTLSeconds  int                      `json:"ttl_seconds"`
} // @name SelectBranchResponse

type SelectBranchItemQuoted struct {
	ProductID uuid.UUID       `json:"product_id"`
	Name      string          `json:"name"`
	UnitPrice decimal.Decimal `json:"unit_price"`
	Quantity  int32           `json:"quantity"`
	LineTotal decimal.Decimal `json:"line_total"`
} // @name SelectBranchItemQuoted

// ─────────────────────────────────────────────────────────────────────────────
// POST /orders/confirm
//
// Single field: the session_id from select-branch. Server uses Redis GETDEL
// so a double-tap returns SESSION_EXPIRED on the second call. Inside a tx:
// lock stock → recheck → decrement → insert order/items/event. Stock race
// loss → 409 STOCK_CONFLICT (client should re-find-branches).
// ─────────────────────────────────────────────────────────────────────────────

type ConfirmOrderRequest struct {
	SessionID uuid.UUID `json:"session_id" binding:"required"`
} // @name ConfirmOrderRequest

// OrderResponse is the success body of confirm. Same shape will be used by
// GET /orders/:id in the next phase.
type OrderResponse struct {
	ID                uuid.UUID           `json:"id"`
	Code              string              `json:"code"`
	UserID            uuid.UUID           `json:"user_id"`
	BranchID          uuid.UUID           `json:"branch_id"`
	Status            string              `json:"status"`
	Subtotal          decimal.Decimal     `json:"subtotal"`
	DiscountTotal     decimal.Decimal     `json:"discount_total"`
	ShippingFee       decimal.Decimal     `json:"shipping_fee"`
	Total             decimal.Decimal     `json:"total"`
	ShippingAddress   string              `json:"shipping_address"`
	ShippingLatitude  *float64            `json:"shipping_latitude,omitempty"`
	ShippingLongitude *float64            `json:"shipping_longitude,omitempty"`
	ContactPhone      *string             `json:"contact_phone,omitempty"`
	Note              *string             `json:"note,omitempty"`
	RoutingReason     *string             `json:"routing_reason,omitempty"`
	PlacedAt          time.Time           `json:"placed_at"`
	Items             []OrderItemResponse `json:"items"`
} // @name OrderResponse

type OrderItemResponse struct {
	ID        uuid.UUID       `json:"id"`
	ProductID uuid.UUID       `json:"product_id"`
	Name      string          `json:"name"`
	UnitPrice decimal.Decimal `json:"unit_price"`
	Quantity  int32           `json:"quantity"`
	LineTotal decimal.Decimal `json:"line_total"`
} // @name OrderItemResponse

// StockConflictItem appears in the 409 payload when atomic decrement fails.
// Either the row was deactivated, or someone else grabbed the stock first.
type StockConflictItem struct {
	ProductID    uuid.UUID `json:"product_id"`
	Name         string    `json:"name,omitempty"`
	Requested    int32     `json:"requested"`
	MaxAvailable int32     `json:"max_available"`
} // @name StockConflictItem
