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
	GetMembership(ctx context.Context, userID uuid.UUID) (*uuid.UUID, error)
	UpdateMembership(ctx context.Context, userID, branchID uuid.UUID) error
	DeleteMembership(ctx context.Context, userID uuid.UUID) error
	ListUsersByBranch(ctx context.Context, branchID uuid.UUID) ([]uuid.UUID, error)
	ListUsersByBranchPaged(ctx context.Context, branchID uuid.UUID, limit, offset int32) ([]uuid.UUID, error)
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

// GetMembership returns the branch_id for a user, or nil if no membership exists.
func (r *membershipRepo) GetMembership(ctx context.Context, userID uuid.UUID) (*uuid.UUID, error) {
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

func (r *membershipRepo) UpdateMembership(ctx context.Context, userID, branchID uuid.UUID) error {
	_, err := r.queries(ctx).UpsertBranchMembership(ctx, branchdb.UpsertBranchMembershipParams{
		UserID:   userID,
		BranchID: branchID,
	})
	return err
}

func (r *membershipRepo) DeleteMembership(ctx context.Context, userID uuid.UUID) error {
	return r.queries(ctx).DeleteBranchMembership(ctx, userID)
}

func (r *membershipRepo) ListUsersByBranch(ctx context.Context, branchID uuid.UUID) ([]uuid.UUID, error) {
	return r.queries(ctx).ListUsersByBranch(ctx, branchID)
}

func (r *membershipRepo) ListUsersByBranchPaged(ctx context.Context, branchID uuid.UUID, limit, offset int32) ([]uuid.UUID, error) {
	return r.queries(ctx).ListUsersByBranchPaginated(ctx, branchdb.ListUsersByBranchPaginatedParams{
		BranchID: branchID,
		Limit:    limit,
		Offset:   offset,
	})
}

func (r *membershipRepo) CountByBranch(ctx context.Context, branchID uuid.UUID) (int64, error) {
	return r.queries(ctx).CountUsersByBranch(ctx, branchID)
}
