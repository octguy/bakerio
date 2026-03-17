package auth

import (
	"context"

	"github.com/google/uuid"
	"github.com/octguy/bakerio/backend/internal/auth/dto"
	"github.com/octguy/bakerio/backend/internal/domain"
)

type Repository interface {
	CreateUser(ctx context.Context, email, password string) (*domain.User, error)
	FindUserByEmail(ctx context.Context, email string) (*domain.User, error)
	FindUserByID(ctx context.Context, id uuid.UUID) (*domain.User, error)
}

type Service interface {
	Register(ctx context.Context, req *dto.RegisterRequest) (*dto.RegisterResponse, error)
	Login(ctx context.Context, req *dto.LoginRequest) (*dto.LoginResponse, error)
}
