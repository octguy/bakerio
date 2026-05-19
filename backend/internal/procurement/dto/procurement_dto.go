package dto

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

type CreatePOItemRequest struct {
	ProductID uuid.UUID       `json:"product_id" binding:"required"`
	Quantity  decimal.Decimal `json:"quantity" binding:"required"`
	UnitPrice decimal.Decimal `json:"unit_price" binding:"required"`
} // @name CreatePOItemRequest

type CreatePORequest struct {
	SupplierID uuid.UUID             `json:"supplier_id" binding:"required"`
	Note       string                `json:"note" binding:"omitempty"`
	Items      []CreatePOItemRequest `json:"items" binding:"required,min=1,dive"`
} // @name CreatePORequest

type POItemResponse struct {
	ID         uuid.UUID       `json:"id"`
	ProductID  uuid.UUID       `json:"product_id"`
	Quantity   decimal.Decimal `json:"quantity"`
	UnitPrice  decimal.Decimal `json:"unit_price"`
	TotalPrice decimal.Decimal `json:"total_price"`
} // @name POItemResponse

type POResponse struct {
	ID          uuid.UUID        `json:"id"`
	SupplierID  uuid.UUID        `json:"supplier_id"`
	BranchID    uuid.UUID        `json:"branch_id"`
	Status      string           `json:"status"`
	TotalAmount decimal.Decimal  `json:"total_amount"`
	Note        *string          `json:"note"`
	Version     int32            `json:"version"`
	CreatedAt   time.Time        `json:"created_at"`
	UpdatedAt   time.Time        `json:"updated_at"`
	Items       []POItemResponse `json:"items,omitempty"`
} // @name POResponse

type UpdatePOStatusRequest struct {
	Status  string `json:"status" binding:"required,oneof=PENDING APPROVED REJECTED RECEIVED"`
	Version int32  `json:"version"`
} // @name UpdatePOStatusRequest
