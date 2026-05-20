package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	branchdb "github.com/octguy/bakerio/backend/db/sqlc/branch"
	"github.com/octguy/bakerio/backend/pkg/txmanager"
)

type MembershipRepository interface {
	Get(ctx context.Context, userID uuid.UUID) (*uuid.UUID, error)
	Upsert(ctx context.Context, userID, branchID uuid.UUID) error
	Delete(ctx context.Context, userID uuid.UUID) error
	ListUsersByBranch(ctx context.Context, branchID uuid.UUID) ([]uuid.UUID, error)
	CountByBranch(ctx context.Context, branchID uuid.UUID) (int64, error)
}

type membershipRepo struct {
	db *branchdb.Queries
}

func NewMembershipRepository(db *branchdb.Queries) MembershipRepository {
	return &membershipRepo{db: db}
}

func (r *membershipRepo) queries(ctx context.Context) *branchdb.Queries {
	if tx, ok := txmanager.Extract(ctx); ok {
		return r.db.WithTx(tx)
	}
	return r.db
}

// Get returns the branch_id for a user, or nil if no membership exists.
func (r *membershipRepo) Get(ctx context.Context, userID uuid.UUID) (*uuid.UUID, error) {
	row, err := r.queries(ctx).GetBranchMembership(ctx, userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	bid := row.BranchID
	return &bid, nil
}

func (r *membershipRepo) Upsert(ctx context.Context, userID, branchID uuid.UUID) error {
	_, err := r.queries(ctx).UpsertBranchMembership(ctx, branchdb.UpsertBranchMembershipParams{
		UserID:   userID,
		BranchID: branchID,
	})
	return err
}

func (r *membershipRepo) Delete(ctx context.Context, userID uuid.UUID) error {
	return r.queries(ctx).DeleteBranchMembership(ctx, userID)
}

func (r *membershipRepo) ListUsersByBranch(ctx context.Context, branchID uuid.UUID) ([]uuid.UUID, error) {
	return r.queries(ctx).ListUsersByBranch(ctx, branchID)
}

func (r *membershipRepo) CountByBranch(ctx context.Context, branchID uuid.UUID) (int64, error) {
	return r.queries(ctx).CountUsersByBranch(ctx, branchID)
}
