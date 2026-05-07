package repository

import (
	"context"

	"github.com/google/uuid"
	branchdb "github.com/octguy/bakerio/backend/db/sqlc/branch"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
	"github.com/octguy/bakerio/backend/pkg/txmanager"
)

type BranchRepository interface {
	CreateBranch(ctx context.Context, name, address string, lat, lon float32) (*domain.Branch, error)
	FindBranchById(ctx context.Context, id uuid.UUID) (*domain.Branch, error)
	FindAllBranches(ctx context.Context) ([]*domain.Branch, error)
	UpdateBranch(ctx context.Context, branchID uuid.UUID, name, address string, lat, lon float32) (*domain.Branch, error)
	UpdateStatus(ctx context.Context, branchID uuid.UUID, status string) (*domain.Branch, error)
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

func NewBranchRepository (db *branchdb.Queries) BranchRepository {
	return &branchRepo{db: db}
}

func (b *branchRepo) CreateBranch(ctx context.Context, name, address string, lat, lon float32) (*domain.Branch, error) {
	q := b.queries(ctx)
	row, err := q.CreateBranch(ctx, branchdb.CreateBranchParams{
		Name:		name,
		Address: 	address,
		Lat: 		lat,
		Lon:		lon,
	})

	if err != nil {
		return nil, err
	}

	return toEntity(row), nil
}

func (b *branchRepo) FindBranchById(ctx context.Context, id uuid.UUID) (*domain.Branch, error) {
	q := b.queries(ctx)

	row, err := q.GetBranchByID(ctx, id)
	if err != nil {
		return nil, err
	}

	return toEntity(&row), nil
}

func (b *branchRepo) FindAllBranches(ctx context.Context) ([]*domain.Branch, error) {
	q := b.queries(ctx)

	rows, err := q.GetAllBranches(ctx)
	if err != nil {
		return nil, err
	}

	branches := make([]*domain.Branch, 0, len(rows))

	for _, row := range rows {
		r := row

		branches = append (branches, toEntity(&r))
	}

	return branches, nil
}

func (b *branchRepo) UpdateBranch(ctx context.Context, name, address string, lat, lon float32) (*domain.Branch, errord) {
	row, err := b.queries(ctx).UpdateBranch(ctx, branchdb.UpdateBranchParams{
		Name:		name,
		Address:	address,
		Lat:		lat,
		Lon:		lon,
	})
	if err != nil {
		return nil, err
	}
	return toEntity(row), nil
}

func toEntity(dbModel branchdb.BranchBranch) *domain.Branch {
	return &domain.Branch{
		ID: 		dbModel.ID,
		Name:		dbModel.Name,
		Address:	dbModel.Address,
		Lat:		dbModel.Lat,
		Lon:		dbModel.Lon,
		Status:		dbModel.Status,
		CreatedAt:	dbModel.CreatedAt
	}
}