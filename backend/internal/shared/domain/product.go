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
