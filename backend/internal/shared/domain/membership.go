package domain

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// Membership tracks lifetime cumulative spend + a derived tier label per user.
// See documents/business/voucher-membership.md §2. Tier grants nothing
// functional in v1 — it's a badge.
type Membership struct {
	UserID     uuid.UUID
	Tier       string // one of BRONZE / SILVER / GOLD (CHECK at DB)
	TotalSpent decimal.Decimal
	UpdatedAt  time.Time
}
