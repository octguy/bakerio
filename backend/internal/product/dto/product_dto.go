package dto

import (
	"time"

	"github.com/google/uuid"
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
	Total int64             `json:"total"`
	Page  int32             `json:"page"`
	Size  int32             `json:"size"`
} // @name ProductListResponse

type ProductImageResponse struct {
	ID        uuid.UUID `json:"id"`
	ProductID uuid.UUID `json:"product_id"`
	URL       string    `json:"url"`
	AltText   *string   `json:"alt_text,omitempty"`
	SortOrder int32     `json:"sort_order"`
} // @name ProductImageResponse

type SetAvailabilityRequest struct {
	IsActive bool `json:"is_active"`
} // @name SetAvailabilityRequest

type BranchProductResponse struct {
	ProductID uuid.UUID `json:"product_id"`
	BranchID  uuid.UUID `json:"branch_id"`
	IsActive  bool      `json:"is_active"`
} // @name BranchProductResponse
