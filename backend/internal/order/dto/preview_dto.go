package dto

import (
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// FindBranchesRequest is the body of POST /orders/find-branches. The endpoint
// is stateless — it doesn't read the caller's cart. The client passes the
// items it intends to order plus the shipping coordinates. Coordinates are
// optional today; without them we apply a flat fallback shipping fee.
type FindBranchesRequest struct {
	ShippingAddress   string             `json:"shipping_address"   binding:"required"`
	ShippingLatitude  *float64           `json:"shipping_latitude"  binding:"omitempty,latitude"`
	ShippingLongitude *float64           `json:"shipping_longitude" binding:"omitempty,longitude"`
	Items             []FindBranchesItem `json:"items"              binding:"required,min=1,dive"`
} // @name FindBranchesRequest

type FindBranchesItem struct {
	ProductID uuid.UUID `json:"product_id" binding:"required"`
	Quantity  int32     `json:"quantity"   binding:"required,min=1,max=99"`
} // @name FindBranchesItem

// FindBranchesResponse is the success body. When Options is non-empty, the
// user picks one and the client submits a future POST /orders with that
// branch_id. When Options is empty and Missing is non-empty, the cart can't
// be fulfilled anywhere — UI should highlight those items.
type FindBranchesResponse struct {
	Subtotal decimal.Decimal   `json:"subtotal"`
	Options  []BranchOptionDTO `json:"options"`
	Missing  []MissingItemDTO  `json:"missing"`
} // @name FindBranchesResponse

type BranchOptionDTO struct {
	BranchID    uuid.UUID       `json:"branch_id"`
	Name        string          `json:"name"`
	Address     string          `json:"address"`
	Lat         float64         `json:"lat"`
	Lng         float64         `json:"lng"`
	DistanceKm  *float64        `json:"distance_km,omitempty"`
	ShippingFee decimal.Decimal `json:"shipping_fee"`
	Total       decimal.Decimal `json:"total"`
	RoutingNote string          `json:"routing_note"`
} // @name BranchOptionDTO

type MissingItemDTO struct {
	ProductID    uuid.UUID `json:"product_id"`
	Name         string    `json:"name"`
	Requested    int32     `json:"requested"`
	MaxAvailable int32     `json:"max_available"`
} // @name MissingItemDTO
