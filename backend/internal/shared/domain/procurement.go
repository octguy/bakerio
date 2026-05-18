package domain

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

type PurchaseOrder struct {
	ID           uuid.UUID
	SupplierID   uuid.UUID
	BranchID     uuid.UUID
	Status       string // DRAFT, PENDING, APPROVED, REJECTED, RECEIVED
	TotalAmount  decimal.Decimal
	Note         *string
	CreatedAt    time.Time
	UpdatedAt    time.Time
	DeletedAt    *time.Time
	CreatedBy    *uuid.UUID
	UpdatedBy    *uuid.UUID
	Items        []*POItem
}

type POItem struct {
	ID         uuid.UUID
	POID       uuid.UUID
	ProductID  uuid.UUID
	Quantity   decimal.Decimal
	UnitPrice  decimal.Decimal
	TotalPrice decimal.Decimal
}
