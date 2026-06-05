package dto

import (
	"github.com/shopspring/decimal"
)

// MembershipResponse is the GET /me/membership body. NextTierThreshold is
// nil when the caller is already at the top tier (GOLD) — the frontend uses
// that to hide the progress bar.
type MembershipResponse struct {
	Tier              string           `json:"tier"`
	TotalSpent        decimal.Decimal  `json:"total_spent"`
	NextTierThreshold *decimal.Decimal `json:"next_tier_threshold,omitempty"`
} // @name MembershipResponse
