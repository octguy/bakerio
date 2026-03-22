package repository

import (
	"context"

	"github.com/bytedance/gopkg/util/logger"
	"github.com/google/uuid"
	authdb "github.com/octguy/bakerio/backend/db/sqlc/auth"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
	"github.com/octguy/bakerio/backend/pkg/txmanager"
)

type AuthRepository interface {
	CreateAccount(ctx context.Context, email, password string) (*domain.User, error)
	FindUserByEmail(ctx context.Context, email string) (*domain.User, error)
	FindUserByID(ctx context.Context, id uuid.UUID) (*domain.User, error)
}

type authRepo struct {
	db *authdb.Queries
}

func NewAuthRepo(db *authdb.Queries) AuthRepository {
	return &authRepo{
		db: db,
	}
}

func (r *authRepo) queries(ctx context.Context) *authdb.Queries {
	if tx, ok := txmanager.Extract(ctx); ok {
		return r.db.WithTx(tx)
	}
	return r.db
}

func (r *authRepo) CreateAccount(ctx context.Context, email, password string) (*domain.User, error) {
	q := r.queries(ctx)

	row, err := q.CreateUser(ctx, authdb.CreateUserParams{
		Email:         email,
		EmailVerified: false,
		IsActive:      false,
	})
	logger.Info("CreateAccount %v", row)
	if err != nil {
		return nil, err
	}

	_, err = q.CreateAuthCredential(ctx, authdb.CreateAuthCredentialParams{
		UserID:       row.ID,
		PasswordHash: password,
	})
	logger.Info("CreateAuthCredentials %v")

	if err != nil {
		return nil, err
	}

	return toEntity(&row), nil
}

func (r *authRepo) FindUserByEmail(ctx context.Context, email string) (*domain.User, error) {
	q := r.queries(ctx)

	row, err := q.GetUserByEmail(ctx, email)
	if err != nil {
		return nil, err
	}

	return toEntity(&row), nil
}

func (r *authRepo) FindUserByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	row, err := r.db.GetUserByID(ctx, id)
	if err != nil {
		return nil, err
	}

	return toEntity(&row), nil
}

func toEntity(u *authdb.AuthUser) *domain.User {
	return &domain.User{
		ID:            u.ID,
		Email:         u.Email,
		EmailVerified: u.EmailVerified,
		IsActive:      u.IsActive,
	}
}
