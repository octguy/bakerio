package event

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

type UserRegisteredPayload struct {
	UserID      uuid.UUID `json:"user_id"`
	Email       string    `json:"email"`
	DisplayName string    `json:"display_name"`
}

// OrderPlacedPayload is published from /orders/confirm. Carries enough for
// the consumer to (a) build a customer receipt email, (b) write a per-user
// in-app row for the customer, and (c) fan out to every user in
// branch.branch_memberships for the order's branch.
type OrderPlacedPayload struct {
	OrderID    uuid.UUID       `json:"order_id"`
	OrderCode  string          `json:"order_code"`
	UserID     uuid.UUID       `json:"user_id"`
	UserEmail  string          `json:"user_email"`
	BranchID   uuid.UUID       `json:"branch_id"`
	BranchName string          `json:"branch_name"`
	Total      decimal.Decimal `json:"total"`
	ItemCount  int             `json:"item_count"`
	PlacedAt   time.Time       `json:"placed_at"`
}

// AuthPasswordChangedPayload — user changed their own password.
// Security-sensitive → in-app + email.
type AuthPasswordChangedPayload struct {
	UserID    uuid.UUID `json:"user_id"`
	Email     string    `json:"email"`
	ChangedAt time.Time `json:"changed_at"`
}

// AuthPasswordResetByAdminPayload — admin forcibly set a user's password.
// The new credentials are NOT in the payload (out-of-band).
type AuthPasswordResetByAdminPayload struct {
	UserID  uuid.UUID `json:"user_id"`
	Email   string    `json:"email"`
	ResetAt time.Time `json:"reset_at"`
}

// MembershipTierUpgradedPayload — fired from /orders/confirm when the
// post-spend recompute promoted the user to a higher tier.
type MembershipTierUpgradedPayload struct {
	UserID     uuid.UUID `json:"user_id"`
	FromTier   string    `json:"from_tier"`
	ToTier     string    `json:"to_tier"`
	UpgradedAt time.Time `json:"upgraded_at"`
}
