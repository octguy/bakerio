package domain

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

type ProductPrice struct {
	ID        uuid.UUID
	ProductID uuid.UUID
	BranchID  uuid.UUID
	Price     decimal.Decimal
	IsActive  bool
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt *time.Time
	CreatedBy *uuid.UUID
	UpdatedBy *uuid.UUID
}
