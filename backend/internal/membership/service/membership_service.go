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

// Service is the cross-module facade. The order module calls ApplyOrderSpend
// from inside /orders/confirm's tx; the customer-facing /me/membership reads
// via GetForUser.
type Service interface {
	GetForUser(ctx context.Context, userID uuid.UUID) (dto.MembershipResponse, error)
	// ApplyOrderSpend increments the user's lifetime spend by delta and
	// recomputes their tier from the new total. Must be called inside the
	// caller's tx (tx-aware ctx); both the upsert and the tier update share
	// that tx so the row is consistent on commit.
	ApplyOrderSpend(ctx context.Context, userID uuid.UUID, delta decimal.Decimal) error
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

func (s *service) ApplyOrderSpend(ctx context.Context, userID uuid.UUID, delta decimal.Decimal) error {
	if delta.LessThanOrEqual(decimal.Zero) {
		// Defensive: confirm should pass a positive total. Refusing to write
		// keeps the ledger monotonic.
		return apperrors.Internal("membership spend delta must be positive", nil)
	}
	m, err := s.repo.UpsertSpend(ctx, userID, delta)
	if err != nil {
		return apperrors.Internal("failed to upsert membership spend", err)
	}
	want := TierFor(m.TotalSpent)
	if want == m.Tier {
		return nil
	}
	if _, err := s.repo.UpdateTier(ctx, userID, want); err != nil {
		return apperrors.Internal("failed to update membership tier", err)
	}
	return nil
}
