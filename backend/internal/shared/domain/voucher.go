package domain

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// Voucher is a percent-discount code redeemable once per user. See
// documents/business/voucher-membership.md.
type Voucher struct {
	ID              uuid.UUID
	Code            string
	DiscountPercent int16
	MaxDiscount     *decimal.Decimal // raw VND ceiling on the discount; nil = uncapped
	MinSubtotal     *decimal.Decimal // raw VND floor for subtotal; nil = no minimum
	ValidFrom       time.Time
	ValidTo         time.Time
	IsActive        bool
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

// VoucherRedemption is the immutable ledger of which user spent which voucher
// on which order. UNIQUE(voucher_id, user_id) at the DB level is the v1
// usage-cap mechanism.
type VoucherRedemption struct {
	ID             uuid.UUID
	VoucherID      uuid.UUID
	UserID         uuid.UUID
	OrderID        uuid.UUID
	DiscountAmount decimal.Decimal
	RedeemedAt     time.Time
}
