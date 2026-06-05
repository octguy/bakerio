package dto

import (
	"time"

	"github.com/google/uuid"
	"github.com/octguy/bakerio/backend/pkg/pagination"
	"github.com/shopspring/decimal"
)

type CreateProductRequest struct {
	Name       string          `json:"name"        binding:"required,max=100"`
	CategoryID uuid.UUID       `json:"category_id" binding:"required"`
	Price      decimal.Decimal `json:"price"       binding:"required"`
	SortOrder  int32           `json:"sort_order"`
} // @name CreateProductRequest

type UpdateProductRequest struct {
	Name       string          `json:"name"        binding:"required,max=100"`
	CategoryID uuid.UUID       `json:"category_id" binding:"required"`
	Price      decimal.Decimal `json:"price"       binding:"required"`
	SortOrder  int32           `json:"sort_order"`
	IsActive   bool            `json:"is_active"`
} // @name UpdateProductRequest

type ProductResponse struct {
	ID         uuid.UUID       `json:"id"`
	Name       string          `json:"name"`
	Slug       string          `json:"slug"`
	CategoryID uuid.UUID       `json:"category_id"`
	Price      decimal.Decimal `json:"price"`
	SortOrder  int32           `json:"sort_order"`
	IsActive   bool            `json:"is_active"`
	CreatedAt  time.Time       `json:"created_at"`
	UpdatedAt  time.Time       `json:"updated_at"`
} // @name ProductResponse

type ProductListResponse struct {
	Items []ProductResponse `json:"items"`
	pagination.Meta
} // @name ProductListResponse

// ProductListFilter holds optional search params for GET /products.
// All fields are optional; empty/nil means "no filter on that column".
type ProductListFilter struct {
	Q            string           // matches name OR slug (ILIKE %q%)
	CategorySlug string           // exact match on the joined category slug
	MinPrice     *decimal.Decimal // inclusive lower bound
	MaxPrice     *decimal.Decimal // inclusive upper bound
	ActiveOnly   bool             // if true, only products with is_active = TRUE
}

type ProductImageResponse struct {
	ID        uuid.UUID `json:"id"`
	ProductID uuid.UUID `json:"product_id"`
	URL       string    `json:"url"`
	AltText   *string   `json:"alt_text,omitempty"`
	SortOrder int32     `json:"sort_order"`
} // @name ProductImageResponse

// UpdateBranchProductRequest patches per-branch availability and/or on-hand
// stock. At least one field must be provided; omitted fields are unchanged.
type UpdateBranchProductRequest struct {
	IsActive *bool  `json:"is_active,omitempty"`
	Quantity *int32 `json:"quantity,omitempty" binding:"omitempty,min=0"`
} // @name UpdateBranchProductRequest

type BranchProductResponse struct {
	ProductID uuid.UUID `json:"product_id"`
	BranchID  uuid.UUID `json:"branch_id"`
	IsActive  bool      `json:"is_active"`
	Quantity  int32     `json:"quantity"`
} // @name BranchProductResponse

type BranchProductDetailListResponse struct {
	Items []BranchProductDetail `json:"items"`
	pagination.Meta
} // @name BranchProductDetailListResponse

// BranchProductDetail is the enriched per-branch product row returned by the
// admin/manager list endpoint (joins live product name/slug/price).
type BranchProductDetail struct {
	ProductID     uuid.UUID       `json:"product_id"`
	BranchID      uuid.UUID       `json:"branch_id"`
	Name          string          `json:"name"`
	Slug          string          `json:"slug"`
	Price         decimal.Decimal `json:"price"`
	IsActive      bool            `json:"is_active"`
	Quantity      int32           `json:"quantity"`
	ProductActive bool            `json:"product_active"`
} // @name BranchProductDetail
