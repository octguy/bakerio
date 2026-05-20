package service

import (
	"context"

	"github.com/google/uuid"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
	"github.com/octguy/bakerio/backend/internal/user/dto"
	"github.com/octguy/bakerio/backend/internal/user/repository"
	"github.com/octguy/bakerio/backend/pkg/txmanager"
)

type ProfileService interface {
	CreateProfile(ctx context.Context, id uuid.UUID, avatarURL, bio *string, fullName string) error
	GetProfile(ctx context.Context, userID uuid.UUID) (dto.ProfileResponse, error)
	UpdateProfile(ctx context.Context, userID uuid.UUID, req dto.UpdateProfileRequest) (dto.ProfileResponse, error)
}

type profileService struct {
	repo repository.ProfileRepository
	tx   *txmanager.TxManager
}

func NewProfileService(tx *txmanager.TxManager, repo repository.ProfileRepository) ProfileService {
	return &profileService{repo: repo, tx: tx}
}

func (p *profileService) CreateProfile(ctx context.Context, id uuid.UUID, avatarURL, bio *string, fullName string) error {
	_, err := p.repo.CreateProfile(ctx, id, avatarURL, bio, fullName)
	return err
}

func (p *profileService) GetProfile(ctx context.Context, userID uuid.UUID) (dto.ProfileResponse, error) {
	prof, err := p.repo.GetProfileByUserID(ctx, userID)
	if err != nil {
		return dto.ProfileResponse{}, err
	}
	return toResponse(prof), nil
}

func (p *profileService) UpdateProfile(ctx context.Context, userID uuid.UUID, req dto.UpdateProfileRequest) (dto.ProfileResponse, error) {
	// display_name is NOT NULL in the table — load current value if caller didn't provide one.
	displayName := ""
	if req.DisplayName != nil {
		displayName = *req.DisplayName
	} else {
		current, err := p.repo.GetProfileByUserID(ctx, userID)
		if err != nil {
			return dto.ProfileResponse{}, err
		}
		displayName = current.DisplayName
	}

	prof, err := p.repo.UpdateProfile(ctx, userID, displayName, req.Phone, req.Address, req.AvatarURL, req.Bio)
	if err != nil {
		return dto.ProfileResponse{}, err
	}
	return toResponse(prof), nil
}

func toResponse(prof *domain.Profile) dto.ProfileResponse {
	return dto.ProfileResponse{
		ID:          prof.ID,
		UserID:      prof.UserID,
		DisplayName: prof.DisplayName,
		Phone:       prof.Phone,
		Address:     prof.Address,
		AvatarURL:   prof.AvatarURL,
		Bio:         prof.Bio,
	}
}
