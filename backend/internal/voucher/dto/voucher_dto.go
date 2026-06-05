package dto

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"

	"github.com/octguy/bakerio/backend/internal/shared/domain"
	"github.com/octguy/bakerio/backend/pkg/pagination"
)

// ─────────────────────────────────────────────────────────────────────────────
// Cross-module: what the voucher service hands back to the order module at
// /orders/select-branch. Snapshotted into the Redis session so /confirm can
// redeem without re-running the math.
// ─────────────────────────────────────────────────────────────────────────────

type ValidationResult struct {
	Voucher  domain.Voucher
	Discount decimal.Decimal
}

// ─────────────────────────────────────────────────────────────────────────────
// HTTP shapes — admin surface (V4)
// ─────────────────────────────────────────────────────────────────────────────

type CreateVoucherRequest struct {
	Code            string           `json:"code" binding:"required"`
	DiscountPercent int16            `json:"discount_percent" binding:"required,min=1,max=100"`
	MaxDiscount     *decimal.Decimal `json:"max_discount,omitempty"`
	MinSubtotal     *decimal.Decimal `json:"min_subtotal,omitempty"`
	ValidFrom       time.Time        `json:"valid_from" binding:"required"`
	ValidTo         time.Time        `json:"valid_to" binding:"required"`
	IsActive        *bool            `json:"is_active,omitempty"` // default true if omitted
} // @name CreateVoucherRequest

// UpdateVoucherRequest patches selected fields. Nil pointers mean "leave alone".
// max_discount and min_subtotal use double pointer so the caller can also send
// JSON null to clear the cap entirely — but for v1 we keep it as plain pointer
// (set or untouched, never explicitly cleared via the API).
type UpdateVoucherRequest struct {
	DiscountPercent *int16           `json:"discount_percent,omitempty" binding:"omitempty,min=1,max=100"`
	MaxDiscount     *decimal.Decimal `json:"max_discount,omitempty"`
	MinSubtotal     *decimal.Decimal `json:"min_subtotal,omitempty"`
	ValidFrom       *time.Time       `json:"valid_from,omitempty"`
	ValidTo         *time.Time       `json:"valid_to,omitempty"`
	IsActive        *bool            `json:"is_active,omitempty"`
} // @name UpdateVoucherRequest

type VoucherResponse struct {
	ID              uuid.UUID        `json:"id"`
	Code            string           `json:"code"`
	DiscountPercent int16            `json:"discount_percent"`
	MaxDiscount     *decimal.Decimal `json:"max_discount,omitempty"`
	MinSubtotal     *decimal.Decimal `json:"min_subtotal,omitempty"`
	ValidFrom       time.Time        `json:"valid_from"`
	ValidTo         time.Time        `json:"valid_to"`
	IsActive        bool             `json:"is_active"`
	CreatedAt       time.Time        `json:"created_at"`
	UpdatedAt       time.Time        `json:"updated_at"`
} // @name VoucherResponse

type VoucherListResponse struct {
	Items []VoucherResponse `json:"items"`
	pagination.Meta
} // @name VoucherListResponse

// ─────────────────────────────────────────────────────────────────────────────
// HTTP shapes — customer surface (V6)
// ─────────────────────────────────────────────────────────────────────────────

// PublicVoucher is the cut-down voucher row shown to customers: enough to
// understand the offer, no audit fields, no id (the code is what the user
// types at checkout).
type PublicVoucher struct {
	Code            string           `json:"code"`
	DiscountPercent int16            `json:"discount_percent"`
	MaxDiscount     *decimal.Decimal `json:"max_discount,omitempty"`
	MinSubtotal     *decimal.Decimal `json:"min_subtotal,omitempty"`
	ValidFrom       time.Time        `json:"valid_from"`
	ValidTo         time.Time        `json:"valid_to"`
} // @name PublicVoucher

type PublicVoucherListResponse struct {
	Items []PublicVoucher `json:"items"`
	pagination.Meta
} // @name PublicVoucherListResponse

// ToResponse is the canonical domain → DTO mapper.
func ToResponse(v domain.Voucher) VoucherResponse {
	return VoucherResponse{
		ID:              v.ID,
		Code:            v.Code,
		DiscountPercent: v.DiscountPercent,
		MaxDiscount:     v.MaxDiscount,
		MinSubtotal:     v.MinSubtotal,
		ValidFrom:       v.ValidFrom,
		ValidTo:         v.ValidTo,
		IsActive:        v.IsActive,
		CreatedAt:       v.CreatedAt,
		UpdatedAt:       v.UpdatedAt,
	}
}
