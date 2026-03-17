package repository

import (
	"context"

	"github.com/google/uuid"
	authdb "github.com/octguy/bakerio/backend/db/sqlc/auth"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
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
	return &authRepo{db: db}
}

func (r *authRepo) CreateAccount(ctx context.Context, email, password string) (*domain.User, error) {
	user, err := r.db.CreateUser(ctx, authdb.CreateUserParams{
		Email:         email,
		EmailVerified: false,
		IsActive:      false,
	})
	if err != nil {
		return nil, err
	}

	_, err = r.db.CreateAuthCredential(ctx, authdb.CreateAuthCredentialParams{
		UserID:       user.ID,
		PasswordHash: password,
	})
	if err != nil {
		return nil, err
	}

	userCreated := &domain.User{
		ID:            user.ID,
		Email:         user.Email,
		EmailVerified: user.EmailVerified,
		IsActive:      user.IsActive,
	}
	return userCreated, nil
}

func (r *authRepo) FindUserByEmail(ctx context.Context, email string) (*domain.User, error) {
	row, err := r.db.GetUserByEmail(ctx, email)
	if err != nil {
		return nil, err
	}

	res := &domain.User{
		ID:            row.ID,
		Email:         row.Email,
		EmailVerified: row.EmailVerified,
		IsActive:      row.IsActive,
	}
	return res, nil
}

func (r *authRepo) FindUserByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	row, err := r.db.GetUserByID(ctx, id)
	if err != nil {
		return nil, err
	}

	user := &domain.User{
		ID:            row.ID,
		Email:         row.Email,
		EmailVerified: row.EmailVerified,
		IsActive:      row.IsActive,
	}
	return user, nil
}
