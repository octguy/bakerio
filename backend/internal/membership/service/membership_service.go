package service

import (
	"context"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"

	"github.com/octguy/bakerio/backend/internal/membership/dto"
	"github.com/octguy/bakerio/backend/internal/membership/repository"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
)

// Tier labels.
const (
	TierBronze = "BRONZE"
	TierSilver = "SILVER"
	TierGold   = "GOLD"
)

// Tier thresholds in raw VND, from documents/business/voucher-membership.md §2.2.
// Constants here so the rules live in one place; SQL stays tier-agnostic.
var (
	silverThreshold = decimal.NewFromInt(1_000_000)
	goldThreshold   = decimal.NewFromInt(5_000_000)
)

// Tier-based auto-discount percentages applied to subtotal at
// /orders/select-branch. Applies before (and on top of) any voucher discount —
// see documents/business/voucher-membership.md §2.4.
const (
	BronzeDiscountPercent = 0
	SilverDiscountPercent = 5
	GoldDiscountPercent   = 10
)

// Service is the cross-module facade. The order module calls ApplyOrderSpend
// from inside /orders/confirm's tx; the customer-facing /me/membership reads
// via GetForUser.
type Service interface {
	GetForUser(ctx context.Context, userID uuid.UUID) (dto.MembershipResponse, error)
	// ApplyOrderSpend increments the user's lifetime spend by delta and
	// recomputes their tier from the new total. Must be called inside the
	// caller's tx (tx-aware ctx); both the upsert and the tier update share
	// that tx so the row is consistent on commit. Returns the before/after
	// tier so the caller can emit a tier-upgrade event when they differ.
	ApplyOrderSpend(ctx context.Context, userID uuid.UUID, delta decimal.Decimal) (TierChange, error)
}

// TierChange captures the tier transition produced by ApplyOrderSpend.
type TierChange struct {
	From    string
	To      string
	Changed bool
}

type service struct {
	repo repository.MembershipRepository
}

func NewService(repo repository.MembershipRepository) Service {
	return &service{repo: repo}
}

// TierFor derives the tier label from a cumulative spend. Pure function so
// it's unit-testable without a DB and so the order module can predict
// promotions if it ever needs to fire a notification.
func TierFor(totalSpent decimal.Decimal) string {
	switch {
	case totalSpent.GreaterThanOrEqual(goldThreshold):
		return TierGold
	case totalSpent.GreaterThanOrEqual(silverThreshold):
		return TierSilver
	default:
		return TierBronze
	}
}

// DiscountPercentFor returns the auto-discount percentage for a tier label.
// Pure function so the order module can call it after GetForUser without
// pulling additional state through the service.
func DiscountPercentFor(tier string) int {
	switch tier {
	case TierGold:
		return GoldDiscountPercent
	case TierSilver:
		return SilverDiscountPercent
	default:
		return BronzeDiscountPercent
	}
}

// ComputeTierDiscount = floor(subtotal × discountPct / 100). Same flooring
// rule as voucher.computeDiscount so the two stack cleanly without rounding
// surprises.
func ComputeTierDiscount(subtotal decimal.Decimal, tier string) decimal.Decimal {
	pct := DiscountPercentFor(tier)
	if pct == 0 {
		return decimal.Zero
	}
	return subtotal.Mul(decimal.NewFromInt(int64(pct))).Div(decimal.NewFromInt(100)).Floor()
}

// NextTierThreshold returns the spend value the user needs to reach for the
// next promotion. nil = already at GOLD.
func NextTierThreshold(tier string) *decimal.Decimal {
	switch tier {
	case TierBronze:
		t := silverThreshold
		return &t
	case TierSilver:
		t := goldThreshold
		return &t
	default:
		return nil
	}
}

func (s *service) GetForUser(ctx context.Context, userID uuid.UUID) (dto.MembershipResponse, error) {
	m, err := s.repo.GetByUserID(ctx, userID)
	if err != nil {
		return dto.MembershipResponse{}, apperrors.Internal("failed to load membership", err)
	}
	if m == nil {
		// Synthetic BRONZE — never confirmed an order yet. Don't write a row
		// just for a read; the order/confirm path will create it on first use.
		zero := decimal.Zero
		next := silverThreshold
		return dto.MembershipResponse{
			Tier:              TierBronze,
			TotalSpent:        zero,
			NextTierThreshold: &next,
		}, nil
	}
	return dto.MembershipResponse{
		Tier:              m.Tier,
		TotalSpent:        m.TotalSpent,
		NextTierThreshold: NextTierThreshold(m.Tier),
	}, nil
}

func (s *service) ApplyOrderSpend(ctx context.Context, userID uuid.UUID, delta decimal.Decimal) (TierChange, error) {
	if delta.LessThanOrEqual(decimal.Zero) {
		return TierChange{}, apperrors.Internal("membership spend delta must be positive", nil)
	}
	m, err := s.repo.UpsertSpend(ctx, userID, delta)
	if err != nil {
		return TierChange{}, apperrors.Internal("failed to upsert membership spend", err)
	}
	// m.Tier is the value before this spend (UpsertSpend bumps total_spent
	// but doesn't touch the tier column). m.TotalSpent is the new total.
	from := m.Tier
	to := TierFor(m.TotalSpent)
	if to == from {
		return TierChange{From: from, To: to, Changed: false}, nil
	}
	if _, err := s.repo.UpdateTier(ctx, userID, to); err != nil {
		return TierChange{}, apperrors.Internal("failed to update membership tier", err)
	}
	return TierChange{From: from, To: to, Changed: true}, nil
}
