package service

import (
	"context"

	"github.com/google/uuid"
	"github.com/octguy/bakerio/backend/internal/branch/repository"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
)

// MembershipService is the public interface other modules use to read or
// write a user's branch assignment. The user module (orchestrator) calls
// Set/Remove. Handlers that need to enforce branch ownership call Get and
// compare against the target branch.
type MembershipService interface {
	Get(ctx context.Context, userID uuid.UUID) (*uuid.UUID, error)
	Set(ctx context.Context, userID, branchID uuid.UUID) error
	Remove(ctx context.Context, userID uuid.UUID) error
	ListUsersByBranch(ctx context.Context, branchID uuid.UUID) ([]uuid.UUID, error)
}

type membershipService struct {
	repo       repository.MembershipRepository
	branchRepo repository.BranchRepository
}

func NewMembershipService(repo repository.MembershipRepository, branchRepo repository.BranchRepository) MembershipService {
	return &membershipService{repo: repo, branchRepo: branchRepo}
}

func (s *membershipService) Get(ctx context.Context, userID uuid.UUID) (*uuid.UUID, error) {
	return s.repo.Get(ctx, userID)
}

func (s *membershipService) Set(ctx context.Context, userID, branchID uuid.UUID) error {
	br, err := s.branchRepo.GetBranchByID(ctx, branchID)
	if err != nil {
		return apperrors.Internal("database error", err)
	}
	if br == nil {
		return apperrors.NotFound("branch not found")
	}
	return s.repo.Upsert(ctx, userID, branchID)
}

func (s *membershipService) Remove(ctx context.Context, userID uuid.UUID) error {
	return s.repo.Delete(ctx, userID)
}

func (s *membershipService) ListUsersByBranch(ctx context.Context, branchID uuid.UUID) ([]uuid.UUID, error) {
	return s.repo.ListUsersByBranch(ctx, branchID)
}
