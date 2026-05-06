package service

import (
	"context"

	"github.com/google/uuid"
	"github.com/octguy/bakerio/backend/internal/profile/dto"
	"github.com/octguy/bakerio/backend/internal/profile/repository"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
	"github.com/octguy/bakerio/backend/pkg/txmanager"
)

type ProfileService interface {
	CreateProfile(ctx context.Context, id uuid.UUID, avatarURL, bio *string, fullName string) (dto.ProfileResponse, error)
	GetProfile(ctx context.Context, userID uuid.UUID) (dto.ProfileResponse, error)
	UpdateProfile(ctx context.Context, userID uuid.UUID, req dto.UpdateProfileRequest) (dto.ProfileResponse, error)
}

type profileService struct {
	repo repository.ProfileRepository
	tx   *txmanager.TxManager
}

func (p *profileService) CreateProfile(ctx context.Context, id uuid.UUID, avatarURL, bio *string, fullName string) (dto.ProfileResponse, error) {
	prof, err := p.repo.CreateProfile(ctx, id, avatarURL, bio, fullName)
	if err != nil {
		return dto.ProfileResponse{}, err
	}

	return toResponse(prof), nil
}

func (p *profileService) GetProfile(ctx context.Context, userID uuid.UUID) (dto.ProfileResponse, error) {
	prof, err := p.repo.GetProfileByUserID(ctx, userID)
	if err != nil {
		return dto.ProfileResponse{}, err
	}
	return toResponse(prof), nil
}

func (p *profileService) UpdateProfile(ctx context.Context, userID uuid.UUID, req dto.UpdateProfileRequest) (dto.ProfileResponse, error) {
	current, err := p.repo.GetProfileByUserID(ctx, userID)
	if err != nil {
		return dto.ProfileResponse{}, err
	}

	displayName := current.DisplayName
	if req.DisplayName != nil {
		displayName = *req.DisplayName
	}

	prof, err := p.repo.UpdateProfile(ctx, userID, displayName, req.AvatarURL, req.Bio)
	if err != nil {
		return dto.ProfileResponse{}, err
	}
	return toResponse(prof), nil
}

func NewProfileService(tx *txmanager.TxManager, repo repository.ProfileRepository) ProfileService {
	return &profileService{
		repo: repo,
		tx:   tx,
	}
}

func toResponse(prof *domain.Profile) dto.ProfileResponse {
	return dto.ProfileResponse{
		ID:        prof.ID,
		UserID:    prof.UserID,
		FullName:  prof.DisplayName,
		AvatarURL: prof.AvatarURL,
		Bio:       prof.Bio,
	}
}
