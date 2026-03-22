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
	CreateProfile(ctx context.Context, id uuid.UUID, avt, bio *string, fullName string) (*dto.ProfileResponse, error)
}

type profileService struct {
	repo repository.ProfileRepository
	tx   *txmanager.TxManager
}

func (p *profileService) CreateProfile(ctx context.Context, id uuid.UUID, avt, bio *string, fullName string) (*dto.ProfileResponse, error) {
	prof, err := p.repo.CreateProfile(ctx, id, avt, bio, fullName)
	if err != nil {
		return nil, err
	}

	return toResponse(prof), nil
}

func NewProfileService(tx *txmanager.TxManager, repo repository.ProfileRepository) ProfileService {
	return &profileService{
		repo: repo,
		tx:   tx,
	}
}

func toResponse(prof *domain.Profile) *dto.ProfileResponse {
	return &dto.ProfileResponse{
		ID:        prof.ID,
		UserID:    prof.UserID,
		FullName:  prof.DisplayName,
		AvatarURL: prof.AvatarURL,
		Bio:       prof.Bio,
	}
}
