package repository

import (
	"context"

	"github.com/google/uuid"
	authdb "github.com/octguy/bakerio/backend/db/sqlc/auth"
	"github.com/octguy/bakerio/backend/internal/auth"
	"github.com/octguy/bakerio/backend/internal/domain"
	"github.com/octguy/bakerio/backend/internal/platform/logger"
	"go.uber.org/zap"
)

type authRepo struct {
	db *authdb.Queries
}

func NewAuthRepo(db *authdb.Queries) auth.Repository {
	return &authRepo{db: db}
}

func (r *authRepo) CreateUser(ctx context.Context, email, password string) (*domain.User, error) {
	logger.Log.Info("Creating user with email: ", zap.String("email", email))
	row, err := r.db.CreateUser(ctx, authdb.CreateUserParams{
		Email:         email,
		EmailVerified: false,
		IsActive:      true,
	})
	if err != nil {
		logger.Log.Error("Failed to create user: ", zap.Error(err))
		return nil, err
	}

	user := &domain.User{
		ID:            row.ID,
		Email:         row.Email,
		EmailVerified: row.EmailVerified,
		IsActive:      row.IsActive,
	}
	logger.Log.Info("User created successfully: ", zap.String("user_id", user.ID.String()))
	return user, nil
}

func (r *authRepo) FindUserByEmail(ctx context.Context, email string) (*domain.User, error) {
	logger.Log.Info("Finding user by email: ", zap.String("email", email))
	return nil, nil
}

func (r *authRepo) FindUserByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	logger.Log.Info("Finding user by ID: ", zap.String("id", id.String()))
	return nil, nil
}
