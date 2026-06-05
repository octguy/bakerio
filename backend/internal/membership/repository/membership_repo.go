package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"

	membershipdb "github.com/octguy/bakerio/backend/db/sqlc/membership"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
	"github.com/octguy/bakerio/backend/pkg/txmanager"
)

type MembershipRepository interface {
	GetByUserID(ctx context.Context, userID uuid.UUID) (*domain.Membership, error)
	// UpsertSpend atomically adds `delta` to total_spent (creating the row with
	// (BRONZE, delta) if absent). Returns the resulting row so the service can
	// recompute tier in Go and call UpdateTier in the same tx.
	UpsertSpend(ctx context.Context, userID uuid.UUID, delta decimal.Decimal) (*domain.Membership, error)
	UpdateTier(ctx context.Context, userID uuid.UUID, tier string) (*domain.Membership, error)
}

type membershipRepo struct {
	db   *membershipdb.Queries
	pool *pgxpool.Pool
}

func NewMembershipRepository(db *membershipdb.Queries, pool *pgxpool.Pool) MembershipRepository {
	return &membershipRepo{db: db, pool: pool}
}

func (r *membershipRepo) queries(ctx context.Context) *membershipdb.Queries {
	if tx, ok := txmanager.Extract(ctx); ok {
		return r.db.WithTx(tx)
	}
	return r.db
}

func (r *membershipRepo) GetByUserID(ctx context.Context, userID uuid.UUID) (*domain.Membership, error) {
	row, err := r.queries(ctx).GetMembershipByUserID(ctx, userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	m := toMembership(row)
	return &m, nil
}

func (r *membershipRepo) UpsertSpend(ctx context.Context, userID uuid.UUID, delta decimal.Decimal) (*domain.Membership, error) {
	row, err := r.queries(ctx).UpsertMembershipSpend(ctx, membershipdb.UpsertMembershipSpendParams{
		UserID:     userID,
		TotalSpent: delta,
	})
	if err != nil {
		return nil, err
	}
	m := toMembership(row)
	return &m, nil
}

func (r *membershipRepo) UpdateTier(ctx context.Context, userID uuid.UUID, tier string) (*domain.Membership, error) {
	row, err := r.queries(ctx).UpdateMembershipTier(ctx, membershipdb.UpdateMembershipTierParams{
		UserID: userID,
		Tier:   tier,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	m := toMembership(row)
	return &m, nil
}

func toMembership(row membershipdb.UsersMembership) domain.Membership {
	return domain.Membership{
		UserID:     row.UserID,
		Tier:       row.Tier,
		TotalSpent: row.TotalSpent,
		UpdatedAt:  row.UpdatedAt,
	}
}
