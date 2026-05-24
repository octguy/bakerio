package service

import (
	"context"

	"github.com/google/uuid"
	"github.com/octguy/bakerio/backend/internal/branch/dto"
	"github.com/octguy/bakerio/backend/internal/branch/repository"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
)

// MembershipService is the data layer for a user's branch assignment.
// It performs no authorization — callers (handlers) enforce who may touch
// which branch. The user module also consumes this interface to write a
// membership row right after creating a staff account.
type MembershipService interface {
	GetMembership(ctx context.Context, userID uuid.UUID) (dto.MembershipResponse, error)
	SetMembership(ctx context.Context, userID, branchID uuid.UUID) error
	RemoveMembership(ctx context.Context, userID uuid.UUID) error
	ListUsersByBranch(ctx context.Context, branchID uuid.UUID) ([]uuid.UUID, error)
}

type membershipService struct {
	repo       repository.MembershipRepository
	branchRepo repository.BranchRepository
}

func NewMembershipService(repo repository.MembershipRepository, branchRepo repository.BranchRepository) MembershipService {
	return &membershipService{repo: repo, branchRepo: branchRepo}
}

// GetMembership returns the user's branch assignment, or NotFound if the user
// belongs to no branch.
func (m *membershipService) GetMembership(ctx context.Context, userID uuid.UUID) (dto.MembershipResponse, error) {
	branchID, err := m.repo.GetMembership(ctx, userID)
	if err != nil {
		return dto.MembershipResponse{}, apperrors.Internal("database error", err)
	}
	if branchID == nil {
		return dto.MembershipResponse{}, apperrors.NotFound("membership not found")
	}
	return dto.MembershipResponse{UserID: userID, BranchID: *branchID}, nil
}

// SetMembership assigns (or moves) a user to a branch. Validates that the
// branch exists first.
func (m *membershipService) SetMembership(ctx context.Context, userID, branchID uuid.UUID) error {
	br, err := m.branchRepo.GetBranchByID(ctx, branchID)
	if err != nil {
		return apperrors.Internal("database error", err)
	}
	if br == nil {
		return apperrors.NotFound("branch not found")
	}
	return m.repo.UpdateMembership(ctx, userID, branchID)
}

func (m *membershipService) RemoveMembership(ctx context.Context, userID uuid.UUID) error {
	return m.repo.DeleteMembership(ctx, userID)
}

func (m *membershipService) ListUsersByBranch(ctx context.Context, branchID uuid.UUID) ([]uuid.UUID, error) {
	return m.repo.ListUsersByBranch(ctx, branchID)
}
