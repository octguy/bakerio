package domain

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

type Product struct {
	ID          uuid.UUID
	SKU         string
	Name        string
	Slug        string
	Description *string
	CategoryID  *uuid.UUID
	BasePrice   decimal.Decimal
	Unit        string
	IsActive    bool
	CreatedAt   time.Time
	UpdatedAt   time.Time
	DeletedAt   *time.Time
	CreatedBy   *uuid.UUID
	UpdatedBy   *uuid.UUID

	// Aggregate relations
	Category *Category
	Images   []*ProductImage
	Prices   []*ProductPrice
	PriceHistory []*ProductPriceHistory
}

type ProductPriceHistory struct {
	ID          uuid.UUID
	ProductID   uuid.UUID
	BranchID    *uuid.UUID
	Price       decimal.Decimal
	EffectiveAt time.Time
	ChangedBy   *uuid.UUID
}
