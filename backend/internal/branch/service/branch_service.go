package service

import (
	"context"

	"github.com/google/uuid"
	"github.com/octguy/bakerio/backend/internal/branch/dto"
	"github.com/octguy/bakerio/backend/internal/branch/repository"
	"github.com/octguy/bakerio/backend/internal/platform/logger"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
	"github.com/octguy/bakerio/backend/pkg/pagination"
	"github.com/octguy/bakerio/backend/pkg/txmanager"
	"go.uber.org/zap"
)

// ProductSeeder is the port the branch module calls after creating a branch so
// the product module can fan out per-branch availability rows. The product
// module provides the implementation (it writes its own tables).
type ProductSeeder interface {
	SeedBranch(ctx context.Context, branchID uuid.UUID) error
}

type BranchService interface {
	CreateBranch(ctx context.Context, req dto.CreateBranchRequest) (dto.BranchResponse, error)
	GetBranchByID(ctx context.Context, id uuid.UUID) (dto.BranchResponse, error)
	GetAllBranches(ctx context.Context) ([]dto.BranchResponse, error)
	ListBranches(ctx context.Context, p pagination.Params) (dto.BranchListResponse, error)
	ListBranchIDs(ctx context.Context) ([]uuid.UUID, error)
	UpdateBranch(ctx context.Context, id uuid.UUID, req dto.UpdateBranchRequest) (dto.BranchResponse, error)
	UpdateBranchStatus(ctx context.Context, id uuid.UUID, status string) error

	// SetProductSeeder wires the cross-module fan-out hook (called from main).
	SetProductSeeder(seeder ProductSeeder)
}

type branchService struct {
	tx     *txmanager.TxManager
	repo   repository.BranchRepository
	seeder ProductSeeder
}

func NewBranchService(tx *txmanager.TxManager, repo repository.BranchRepository) BranchService {
	return &branchService{tx: tx, repo: repo}
}

func (b *branchService) SetProductSeeder(seeder ProductSeeder) { b.seeder = seeder }

func (b *branchService) CreateBranch(ctx context.Context, req dto.CreateBranchRequest) (dto.BranchResponse, error) {
	created, err := b.repo.CreateBranch(ctx, req.Name, req.Address, req.Lat, req.Lng)
	if err != nil {
		return dto.BranchResponse{}, apperrors.Internal("database error", err)
	}

	// Fan out inactive availability rows for the new branch (separate module,
	// separate tx). Best-effort: a failure leaves the branch with no product
	// rows, which a manager can re-seed; we log rather than fail the create.
	if b.seeder != nil {
		if err := b.seeder.SeedBranch(ctx, created.ID); err != nil {
			logger.Log.Error("branch: product fan-out failed",
				zap.String("branch_id", created.ID.String()), zap.Error(err))
		}
	}
	return toResponse(created), nil
}

func (b *branchService) ListBranchIDs(ctx context.Context) ([]uuid.UUID, error) {
	rows, err := b.repo.GetAllBranches(ctx)
	if err != nil {
		return nil, apperrors.Internal("database error", err)
	}
	ids := make([]uuid.UUID, 0, len(rows))
	for _, r := range rows {
		ids = append(ids, r.ID)
	}
	return ids, nil
}

func (b *branchService) GetBranchByID(ctx context.Context, id uuid.UUID) (dto.BranchResponse, error) {
	branch, err := b.repo.GetBranchByID(ctx, id)
	if err != nil {
		return dto.BranchResponse{}, apperrors.Internal("database error", err)
	}

	if branch == nil {
		return dto.BranchResponse{}, apperrors.NotFound("branch not found")
	}

	return toResponse(branch), nil
}

func (b *branchService) GetAllBranches(ctx context.Context) ([]dto.BranchResponse, error) {
	rows, err := b.repo.GetAllBranches(ctx)
	if err != nil {
		return make([]dto.BranchResponse, 0, len(rows)), apperrors.Internal("database error", err)
	}
	branches := make([]dto.BranchResponse, 0, len(rows))

	for _, row := range rows {
		r := row

		branches = append(branches, toResponse(r))
	}

	return branches, nil
}

func (b *branchService) ListBranches(ctx context.Context, p pagination.Params) (dto.BranchListResponse, error) {
	rows, err := b.repo.ListBranches(ctx, p.Size, p.Offset())
	if err != nil {
		return dto.BranchListResponse{}, apperrors.Internal("database error", err)
	}
	total, err := b.repo.CountBranches(ctx)
	if err != nil {
		return dto.BranchListResponse{}, apperrors.Internal("database error", err)
	}
	items := make([]dto.BranchResponse, 0, len(rows))
	for _, row := range rows {
		items = append(items, toResponse(row))
	}
	return dto.BranchListResponse{Items: items, Meta: pagination.NewMeta(p, total)}, nil
}

func (b *branchService) UpdateBranch(ctx context.Context, id uuid.UUID, req dto.UpdateBranchRequest) (dto.BranchResponse, error) {
	current, err := b.repo.GetBranchByID(ctx, id)
	if err != nil {
		return dto.BranchResponse{}, apperrors.Internal("database error", err)
	}

	if current == nil {
		return dto.BranchResponse{}, apperrors.NotFound("branch not found")
	}

	name := current.Name
	if req.Name != nil {
		name = *req.Name
	}

	address := current.Address
	if req.Address != nil {
		address = *req.Address
	}

	lat := current.Lat
	if req.Lat != nil {
		lat = req.Lat
	}

	lng := current.Lng
	if req.Lng != nil {
		lng = req.Lng
	}

	updated, err := b.repo.UpdateBranch(ctx, id, name, address, lat, lng)
	if err != nil {
		return dto.BranchResponse{}, apperrors.Internal("database error", err)
	}
	return toResponse(updated), nil
}

func (b *branchService) UpdateBranchStatus(ctx context.Context, id uuid.UUID, status string) error {
	err := b.repo.UpdateBranchStatus(ctx, id, status)
	if err != nil {
		return apperrors.Internal("database error", err)
	}
	return nil
}

func toResponse(branch *domain.Branch) dto.BranchResponse {
	return dto.BranchResponse{
		ID:        branch.ID,
		Name:      branch.Name,
		Address:   branch.Address,
		Lat:       branch.Lat,
		Lng:       branch.Lng,
		Status:    branch.Status,
		CreatedAt: branch.CreatedAt,
	}
}
