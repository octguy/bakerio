package dto

import (
	"time"

	"github.com/google/uuid"
	"github.com/octguy/bakerio/backend/pkg/pagination"
	"github.com/shopspring/decimal"
)

// OrderListFilter is the parsed `?code=&user_id=&branch_id=&from=&to=` query.
// Service auto-scopes UserID/BranchID based on the caller's permissions —
// e.g. a customer's UserID is forced to their own; a branch_manager's
// BranchID is forced to their own. See order_query_service for details.
type OrderListFilter struct {
	Code     string     // matches orders.orders.code (ILIKE %code%)
	UserID   *uuid.UUID // exact match
	BranchID *uuid.UUID // exact match
	From     *time.Time // placed_at >= From
	To       *time.Time // placed_at <  To
}

// OrderSummary is one row in /orders. Joins branch name so the UI can render
// the list without a second round-trip. Items are inlined for admin /
// branch staff / branch manager callers (operational view) but omitted for
// customer callers — they can fetch GET /orders/:id for full detail.
type OrderSummary struct {
	ID              uuid.UUID           `json:"id"`
	Code            string              `json:"code"`
	UserID          uuid.UUID           `json:"user_id"`
	BranchID        uuid.UUID           `json:"branch_id"`
	BranchName      string              `json:"branch_name"`
	Subtotal        decimal.Decimal     `json:"subtotal"`
	ShippingFee     decimal.Decimal     `json:"shipping_fee"`
	Total           decimal.Decimal     `json:"total"`
	ShippingAddress string              `json:"shipping_address"`
	PlacedAt        time.Time           `json:"placed_at"`
	Items           []OrderItemResponse `json:"items,omitempty"`
} // @name OrderSummary

type OrderListResponse struct {
	Items []OrderSummary `json:"items"`
	pagination.Meta
} // @name OrderListResponse
