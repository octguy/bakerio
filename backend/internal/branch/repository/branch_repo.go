package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	branchdb "github.com/octguy/bakerio/backend/db/sqlc/branch"
	"github.com/octguy/bakerio/backend/internal/shared/authcontext"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
	"github.com/octguy/bakerio/backend/pkg/txmanager"
)

type BranchRepository interface {
	CreateBranch(ctx context.Context, name, address string, lat, lng *float64, region string) (*domain.Branch, error)
	GetBranchByID(ctx context.Context, id uuid.UUID) (*domain.Branch, error)
	GetAllBranches(ctx context.Context) ([]*domain.Branch, error)
	UpdateBranch(ctx context.Context, branchID uuid.UUID, name, address string, lat, lng *float64, region string) (*domain.Branch, error)
	UpdateBranchStatus(ctx context.Context, branchID uuid.UUID, status string) error
	SoftDeleteBranch(ctx context.Context, branchID uuid.UUID) error
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

func (b *branchRepo) CreateBranch(ctx context.Context, name, address string, lat, lng *float64, region string) (*domain.Branch, error) {
	callerID, _ := authcontext.CallerID(ctx)
	q := b.queries(ctx)
	row, err := q.CreateBranch(ctx, branchdb.CreateBranchParams{
		Name:      name,
		Address:   address,
		Lat:       lat,
		Lng:       lng,
		Region:    region,
		CreatedBy: nullableUUID(callerID),
		UpdatedBy: nullableUUID(callerID),
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
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
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
		branches = append(branches, toEntity(row))
	}

	return branches, nil
}

func (b *branchRepo) UpdateBranch(ctx context.Context, id uuid.UUID, name, address string, lat, lng *float64, region string) (*domain.Branch, error) {
	callerID, _ := authcontext.CallerID(ctx)
	q := b.queries(ctx)

	row, err := q.UpdateBranch(ctx, branchdb.UpdateBranchParams{
		Name:      name,
		Address:   address,
		Lat:       lat,
		Lng:       lng,
		Region:    region,
		UpdatedBy: nullableUUID(callerID),
		ID:        id,
	})
	if err != nil {
		return nil, err
	}
	return toEntity(row), nil
}

func (b *branchRepo) UpdateBranchStatus(ctx context.Context, id uuid.UUID, status string) error {
	callerID, _ := authcontext.CallerID(ctx)
	q := b.queries(ctx)

	err := q.UpdateBranchStatus(ctx, branchdb.UpdateBranchStatusParams{
		Status:    status,
		UpdatedBy: nullableUUID(callerID),
		ID:        id,
	})
	if err != nil {
		return err
	}
	return nil
}

func (b *branchRepo) SoftDeleteBranch(ctx context.Context, branchID uuid.UUID) error {
	callerID, _ := authcontext.CallerID(ctx)
	q := b.queries(ctx)

	return q.SoftDeleteBranch(ctx, branchdb.SoftDeleteBranchParams{
		ID:        branchID,
		UpdatedBy: nullableUUID(callerID),
	})
}

func toEntity(dbModel branchdb.BranchBranch) *domain.Branch {
	return &domain.Branch{
		ID:        dbModel.ID,
		Name:      dbModel.Name,
		Address:   dbModel.Address,
		Lat:       dbModel.Lat,
		Lng:       dbModel.Lng,
		Status:    dbModel.Status,
		Region:    dbModel.Region,
		CreatedAt: dbModel.CreatedAt,
		UpdatedAt: dbModel.UpdatedAt,
		DeletedAt: dbModel.DeletedAt,
		CreatedBy: dbModel.CreatedBy,
		UpdatedBy: dbModel.UpdatedBy,
	}
}

func nullableUUID(id uuid.UUID) *uuid.UUID {
	if id == uuid.Nil {
		return nil
	}
	return &id
}
