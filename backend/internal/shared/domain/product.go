package domain

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

type Product struct {
	ID         uuid.UUID
	Name       string
	Slug       string
	CategoryID uuid.UUID
	Price      decimal.Decimal
	SortOrder  int32
	IsActive   bool
	DeletedAt  *time.Time
	CreatedAt  time.Time
	CreatedBy  *uuid.UUID
	UpdatedAt  time.Time
	UpdatedBy  *uuid.UUID
}

// ProductImage is an image attached to a product. ImageKey is the object key
// in storage (kept in the image_url column); the public URL is built at read
// time from the storage config.
type ProductImage struct {
	ID        uuid.UUID
	ProductID uuid.UUID
	ImageKey  string
	AltText   *string
	SortOrder int32
	CreatedAt time.Time
}

// BranchProduct is the per-branch availability of a product. is_active is the
// branch-level toggle (opt-in: false until a manager/admin turns it on).
type BranchProduct struct {
	ID        uuid.UUID
	ProductID uuid.UUID
	BranchID  uuid.UUID
	IsActive  bool
	CreatedAt time.Time
	UpdatedAt time.Time
}
