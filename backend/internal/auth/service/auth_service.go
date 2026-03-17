package service

import (
	"context"

	"github.com/octguy/bakerio/backend/internal/auth/dto"
	"github.com/octguy/bakerio/backend/internal/auth/repository"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
	"github.com/octguy/bakerio/backend/pkg/txmanager"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials = apperrors.Unauthorized("invalid credentials")
	ErrEmailTaken         = apperrors.Conflict("email already taken")
)

type AuthService interface {
	Register(ctx context.Context, req *dto.RegisterRequest) (*dto.RegisterResponse, error)
	Login(ctx context.Context, req *dto.LoginRequest) (*dto.LoginResponse, error)
}

type authService struct {
	repo repository.AuthRepository
	tx   *txmanager.TxManager
}

func NewAuthService(repo repository.AuthRepository, tx *txmanager.TxManager) AuthService {
	return &authService{
		repo: repo,
		tx:   tx,
	}
}

func (s *authService) Register(ctx context.Context, req *dto.RegisterRequest) (*dto.RegisterResponse, error) {
	_, err := s.repo.FindUserByEmail(ctx, req.Email)
	if err == nil {
		return nil, ErrEmailTaken
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	var user *domain.User

	err = s.tx.WithTx(ctx, func(txCtx context.Context) error {
		user, err = s.repo.CreateAccount(txCtx, req.Email, string(hashed))
		if err != nil {
			return err
		}
		return nil
	})

	res := &dto.RegisterResponse{
		ID:        user.ID,
		Email:     user.Email,
		FullName:  req.FullName,
		CreatedAt: user.CreatedAt,
	}

	return res, nil
}

func (s *authService) Login(ctx context.Context, req *dto.LoginRequest) (*dto.LoginResponse, error) {
	return nil, nil
}
