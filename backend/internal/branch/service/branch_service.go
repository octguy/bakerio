package service

import (
	"context"

	"github.com/google/uuid"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
	"github.com/octguy/bakerio/backend/internal/branch/dto"
	"github.com/octguy/bakerio/backend/internal/branch/repository"
	"github.com/octguy/bakerio/backend/pkg/txmanager"
)

type BranchService interface {
    CreateBranch(ctx context.Context, req dto.CreateBranchRequest) (dto.BranchResponse, error)
    GetBranchByID(ctx context.Context, id uuid.UUID) (dto.BranchResponse, error)
    GetAllBranches(ctx context.Context) ([]dto.BranchResponse, error)
    UpdateBranch(ctx context.Context, id uuid.UUID, req dto.UpdateBranchRequest) (dto.BranchResponse, error)
    UpdateBranchStatus(ctx context.Context, id uuid.UUID, status string) error
}

type branchService struct {
	repo repository.BranchRepository
}

func NewBranchService(repo repository.BranchRepository) BranchService {
	return &branchService{repo: repo}
}

func (b* branchService) CreateBranch(ctx context.Context, req dto.CreateBranchRequest) (dto.BranchResponse, error) {
	created, err := b.repo.CreateBranch(ctx, req.Name, req.Address, req.Lat, req.Lng)
	if err != nil {
		return dto.BranchResponse{}, apperrors.Internal("database error", err)
	}
	return toResponse(created), nil
}

func (b* branchService) GetBranchByID(ctx context.Context, id uuid.UUID) (dto.BranchResponse, error) {
	branch, err := b.repo.GetBranchByID(ctx, id)
	if err != nil {
		if branch == nil {
			return dto.BranchResponse{}, apperrors.NotFound("branch not found")
		}
		return dto.BranchResponse{}, apperrors.Internal("database error", err)
	}
	return toResponse(branch), nil
}

func (b* branchService) GetAllBranches(ctx context.Context) ([]dto.BranchResponse, error) {
	rows, err := b.repo.GetAllBranches(ctx)
	if err != nil {
		return make([]dto.BranchResponse, 0, len(rows)), apperrors.Internal("database error", err)
	}
	branches := make([]dto.BranchResponse, 0, len(rows))

	for _, row := range rows {
		r := row

		branches = append (branches, toResponse(r))
	}

	return branches, nil
}

func (b* branchService) UpdateBranch(ctx context.Context, id uuid.UUID, req dto.UpdateBranchRequest) (dto.BranchResponse, error) {
	current, err:= b.repo.GetBranchByID(ctx,id)
	if err != nil {
		return dto.BranchResponse{}, apperrors.Internal("database error", err)
	}

	name := current.Name
	if req.Name != nil { name = *req.Name }

	address := current.Address
	if req.Address != nil { address = *req.Address }

	lat := current.Lat
	if req.Lat != nil { lat = req.Lat }

	lng := current.Lng
	if req.Lng != nil { lng = req.Lng }

	updated, err := b.repo.UpdateBranch(ctx, id, name, address, lat, lng)
	if err != nil {
		return dto.BranchResponse{}, apperrors.Internal("database error", err)
	}
	return toResponse(updated), nil
}

func (b* branchService) UpdateBranchStatus(ctx context.Context, id uuid.UUID, status string) error {
	err := b.repo.UpdateBranchStatus(ctx, id, status)
	if err != nil {
		return apperrors.Internal("database error", err)
	}
	return nil
}

func toResponse(branch *domain.Branch) dto.BranchResponse {
	return dto.BranchResponse{
		ID:			branch.ID,
		Name:		branch.Name,
		Address:	branch.Address,
		Lat:		branch.Lat,
		Lng:		branch.Lng,
	}
}