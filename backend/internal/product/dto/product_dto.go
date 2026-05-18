package dto

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

type CreateProductRequest struct {
	SKU         string     `json:"sku" binding:"required,max=50"`
	Name        string     `json:"name" binding:"required,max=150"`
	Description *string    `json:"description"`
	CategoryID  *uuid.UUID `json:"category_id"`
	Unit        string     `json:"unit" binding:"required"`
	Price       *decimal.Decimal `json:"price" binding:"required"` // Default price for a base branch or global
} // @name CreateProductRequest

type UpdateProductRequest struct {
	Name        *string          `json:"name,omitempty" binding:"omitempty,max=150"`
	Description *string          `json:"description,omitempty"`
	CategoryID  *uuid.UUID       `json:"category_id,omitempty"`
	Unit        *string          `json:"unit,omitempty"`
	IsActive    *bool            `json:"is_active,omitempty"`
	BasePrice   *decimal.Decimal `json:"base_price,omitempty"`
} // @name UpdateProductRequest

type ProductResponse struct {
	ID          uuid.UUID              `json:"id"`
	SKU         string                 `json:"sku"`
	Name        string                 `json:"name"`
	Slug        string                 `json:"slug"`
	Description *string                `json:"description"`
	BasePrice   decimal.Decimal        `json:"base_price"`
	Unit        string                 `json:"unit"`
	IsActive    bool                   `json:"is_active"`
	Category    *CategoryResponse      `json:"category,omitempty"`
	Images      []ProductImageResponse `json:"images,omitempty"`
	CreatedAt   time.Time              `json:"created_at"`
	UpdatedAt   time.Time              `json:"updated_at"`
} // @name ProductResponse

type SetPriceRequest struct {
	BranchID uuid.UUID       `json:"branch_id" binding:"required"`
	Price    decimal.Decimal `json:"price" binding:"required"`
} // @name SetPriceRequest

type ProductPriceResponse struct {
	BranchID uuid.UUID       `json:"branch_id"`
	Price    decimal.Decimal `json:"price"`
	IsActive bool            `json:"is_active"`
} // @name ProductPriceResponse

type ProductPriceHistoryResponse struct {
	BranchID    *uuid.UUID      `json:"branch_id,omitempty"`
	Price       decimal.Decimal `json:"price"`
	EffectiveAt time.Time       `json:"effective_at"`
	ChangedBy   *uuid.UUID      `json:"changed_by,omitempty"`
} // @name ProductPriceHistoryResponse
