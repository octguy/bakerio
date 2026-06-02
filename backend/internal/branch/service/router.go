package service

import (
	"context"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// BranchRouter answers: "which branch should fulfill this cart, shipped here?"
//
// The order module consumes this as a port; concrete implementation lives in
// the branch module because the eligibility query reads `branch.branches` +
// `product.branch_products` (a documented cross-schema READ exception, same
// as the user search repo). Order module never writes either table.
type BranchRouter interface {
	FindBranches(ctx context.Context, in FindBranchesInput) (FindBranchesOutput, error)
}

// FindBranchesInput is what the routing endpoint forwards to the router.
// shipping coords are optional today; when nil the router skips distance
// scoring and applies a fallback shipping fee (see the impl).
type FindBranchesInput struct {
	Items   []RequestedItem
	ShipLat *float64
	ShipLng *float64
}

// RequestedItem is one (product_id, quantity) pair from the would-be cart.
type RequestedItem struct {
	ProductID uuid.UUID
	Quantity  int32
}

// FindBranchesOutput contains the ranked branch options *and* the subtotal
// (same for every option — it's a property of the items, not the branch).
// When no branch can fulfill the whole cart, Options is empty and Missing
// names the offending items so the UI can highlight cart rows.
type FindBranchesOutput struct {
	Subtotal decimal.Decimal
	Options  []BranchOption
	Missing  []MissingItem
}

// BranchOption is one eligible fulfillment branch, post-distance + fee calc.
type BranchOption struct {
	BranchID    uuid.UUID
	Name        string
	Address     string
	Lat         float64
	Lng         float64
	DistanceKm  *float64        // nil when caller passed no shipping coords
	ShippingFee decimal.Decimal // computed from distance tier
	Total       decimal.Decimal // = Subtotal + ShippingFee
	RoutingNote string          // "nearest_eligible" or "no_geocode_fallback"
}

// MissingItem explains why no single branch can fulfill the cart: this
// product is requested in a quantity that no active branch carries in stock.
type MissingItem struct {
	ProductID    uuid.UUID
	Name         string
	Requested    int32
	MaxAvailable int32 // max quantity across all active branches; 0 if nowhere
}
