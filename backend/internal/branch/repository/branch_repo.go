package repository

import (
	"context"

	"github.com/google/uuid"
	branchdb "github.com/octguy/bakerio/backend/db/sqlc/branch"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
	"github.com/octguy/bakerio/backend/pkg/txmanager"
)

type BranchRepository interface {
	CreateBranch(ctx context.Context, name, address string, lat, lng *float64) (*domain.Branch, error)
	GetBranchByID(ctx context.Context, id uuid.UUID) (*domain.Branch, error)
	GetAllBranches(ctx context.Context) ([]*domain.Branch, error)
	UpdateBranch(ctx context.Context, branchID uuid.UUID, name, address string, lat, lng *float64) (*domain.Branch, error)
	UpdateBranchStatus(ctx context.Context, branchID uuid.UUID, status string) error
}

type branchRepo struct {
	db *branchdb.Queries
}

func (r *branchRepo) queries(ctx context.Context) *branchdb.Queries {
	if tx, ok := txmanager.Extract(ctx); ok {
		return r.db.WithTx(tx)
	}
	return r.db
}

func NewBranchRepository(db *branchdb.Queries) BranchRepository {
	return &branchRepo{db: db}
}

func (b *branchRepo) CreateBranch(ctx context.Context, name, address string, lat, lng *float64) (*domain.Branch, error) {
	q := b.queries(ctx)
	row, err := q.CreateBranch(ctx, branchdb.CreateBranchParams{
		Name:		name,
		Address: 	address,
		Lat: 		lat,
		Lng:		lng,
	})

	if err != nil {
		return nil, err
	}

	return toEntity(row), nil
}

func (b *branchRepo) GetBranchByID(ctx context.Context, id uuid.UUID) (*domain.Branch, error) {
	q := b.queries(ctx)

	row, err := q.GetBranchByID(ctx, id)
	if err != nil {
		return nil, err
	}

	return toEntity(row), nil
}

func (b *branchRepo) GetAllBranches(ctx context.Context) ([]*domain.Branch, error) {
	q := b.queries(ctx)

	rows, err := q.GetAllBranches(ctx)
	if err != nil {
		return nil, err
	}

	branches := make([]*domain.Branch, 0, len(rows))

	for _, row := range rows {
		r := row

		branches = append (branches, toEntity(r))
	}

	return branches, nil
}

func (b *branchRepo) UpdateBranch(ctx context.Context,id uuid.UUID, name, address string, lat, lng *float64) (*domain.Branch, error) {
	q := b.queries(ctx)

	row, err := q.UpdateBranch(ctx, branchdb.UpdateBranchParams{
		Name:		name,
		Address:	address,
		Lat:		lat,
		Lng:		lng,
		ID:			id,

	})
	if err != nil {
		return nil, err
	}
	return toEntity(row), nil
}

func (b *branchRepo) UpdateBranchStatus(ctx context.Context,id uuid.UUID, status string) error {
	q := b.queries(ctx)

	err := q.UpdateBranchStatus(ctx, branchdb.UpdateBranchStatusParams{
		Status:		status,
		ID:			id,
	})
	if err != nil {
		return err
	}
	return nil
}

func toEntity(dbModel branchdb.BranchBranch) *domain.Branch {
	return &domain.Branch{
		ID: 		dbModel.ID,
		Name:		dbModel.Name,
		Address:	dbModel.Address,
		Lat:		dbModel.Lat,
		Lng:		dbModel.Lng,
		Status:		dbModel.Status,
		CreatedAt:	dbModel.CreatedAt,
	}
}