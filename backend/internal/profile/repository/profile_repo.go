package repository

import (
	"context"

	"github.com/google/uuid"
	profiledb "github.com/octguy/bakerio/backend/db/sqlc/profile"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
	"github.com/octguy/bakerio/backend/pkg/txmanager"
)

type ProfileRepository interface {
	CreateProfile(ctx context.Context, id uuid.UUID, avatarURL, bio *string, fullName string) (*domain.Profile, error)
	GetProfileByUserID(ctx context.Context, userID uuid.UUID) (*domain.Profile, error)
	UpdateProfile(ctx context.Context, userID uuid.UUID, displayName string, avatarURL, bio *string) (*domain.Profile, error)
}

type profileRepo struct {
	db *profiledb.Queries
}

func (r *profileRepo) queries(ctx context.Context) *profiledb.Queries {
	if tx, ok := txmanager.Extract(ctx); ok {
		return r.db.WithTx(tx)
	}
	return r.db
}

func NewProfileRepository(db *profiledb.Queries) ProfileRepository {
	return &profileRepo{db: db}
}

func (p *profileRepo) CreateProfile(ctx context.Context, userId uuid.UUID, avatarURL, bio *string, fullName string) (*domain.Profile, error) {
	q := p.queries(ctx)
	row, err := q.CreateProfile(ctx, profiledb.CreateProfileParams{
		UserID:      userId,
		DisplayName: fullName,
		AvatarUrl:   avatarURL,
		Bio:         bio,
	})

	if err != nil {
		return nil, err
	}

	return toEntity(row), nil
}

func (p *profileRepo) GetProfileByUserID(ctx context.Context, userID uuid.UUID) (*domain.Profile, error) {
	row, err := p.queries(ctx).GetProfileByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	return toEntity(row), nil
}

func (p *profileRepo) UpdateProfile(ctx context.Context, userID uuid.UUID, displayName string, avatarURL, bio *string) (*domain.Profile, error) {
	row, err := p.queries(ctx).UpdateProfile(ctx, profiledb.UpdateProfileParams{
		UserID:      userID,
		DisplayName: displayName,
		AvatarUrl:   avatarURL,
		Bio:         bio,
	})
	if err != nil {
		return nil, err
	}
	return toEntity(row), nil
}

func toEntity(dbModel profiledb.ProfileProfile) *domain.Profile {
	return &domain.Profile{
		ID:          dbModel.ID,
		UserID:      dbModel.UserID,
		DisplayName: dbModel.DisplayName,
		AvatarURL:   dbModel.AvatarUrl,
		Bio:         dbModel.Bio,
		UpdatedAt:   dbModel.UpdatedAt,
	}
}
