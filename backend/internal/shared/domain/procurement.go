package domain

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

const (
	POStatusDraft    = "DRAFT"
	POStatusPending  = "PENDING"
	POStatusApproved = "APPROVED"
	POStatusRejected = "REJECTED"
	POStatusReceived = "RECEIVED"
)

type PurchaseOrder struct {
	ID          uuid.UUID
	Code        *string
	SupplierID  uuid.UUID
	BranchID    uuid.UUID
	Status      string // DRAFT, PENDING, APPROVED, REJECTED, RECEIVED
	TotalAmount decimal.Decimal
	Note        *string
	Version     int32
	SubmittedAt *time.Time
	ApprovedBy  *uuid.UUID
	ApprovedAt  *time.Time
	ReceivedAt  *time.Time
	CancelledAt *time.Time
	CreatedAt   time.Time
	UpdatedAt   time.Time
	DeletedAt   *time.Time
	CreatedBy   *uuid.UUID
	UpdatedBy   *uuid.UUID
	Items       []*POItem
}

type POItem struct {
	ID         uuid.UUID
	POID       uuid.UUID
	ProductID  uuid.UUID
	Quantity   decimal.Decimal
	UnitPrice  decimal.Decimal
	TotalPrice decimal.Decimal
}
