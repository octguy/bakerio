package service

import (
	"context"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/octguy/bakerio/backend/internal/auth/dto"
	"github.com/octguy/bakerio/backend/internal/auth/repository"
	"github.com/octguy/bakerio/backend/internal/profile/service"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
	"github.com/octguy/bakerio/backend/pkg/txmanager"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials = apperrors.Unauthorized("invalid credentials")
	ErrEmailTaken         = apperrors.Conflict("email already taken")
)

type Claims struct {
	UserID uuid.UUID `json:"user_id"`
	jwt.RegisteredClaims
}

type AuthService interface {
	Register(ctx context.Context, req *dto.RegisterRequest) (*dto.RegisterResponse, error)
	Login(ctx context.Context, req *dto.LoginRequest) (*dto.LoginResponse, error)
	ValidateToken(tokenStr string) (*Claims, error)
}

type authService struct {
	repo       repository.AuthRepository
	profileSvc service.ProfileService
	tx         *txmanager.TxManager
	jwtSecret  []byte
	tokenTTL   time.Duration
}

func NewAuthService(repo repository.AuthRepository, tx *txmanager.TxManager, profSvc service.ProfileService, jwtSecret string, tokenTTL time.Duration) AuthService {
	return &authService{
		repo:       repo,
		tx:         tx,
		profileSvc: profSvc,
		jwtSecret:  []byte(jwtSecret),
		tokenTTL:   tokenTTL,
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

		_, err := s.profileSvc.CreateProfile(txCtx, user.ID, nil, nil, req.FullName)

		if err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	res := &dto.RegisterResponse{
		ID:        user.ID,
		Email:     user.Email,
		FullName:  req.FullName,
		CreatedAt: user.CreatedAt,
	}

	return res, nil
}

func (s *authService) Login(ctx context.Context, req *dto.LoginRequest) (*dto.LoginResponse, error) {
	user, err := s.repo.FindUserWithCredentialsByEmail(ctx, req.Email)

	//if (user == nil || user.ID == uuid.Nil) && err == nil {
	//	fmt.Println("user", user)
	//	return nil, ErrEmailTaken
	//}

	if err != nil {
		fmt.Println(err.Error())
		return nil, ErrInvalidCredentials
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		log.Printf("[WARN] login failed - invalid password: email=%s", req.Email)
		return nil, ErrInvalidCredentials
	}

	// Login successful, generate JWT
	token, err := s.generateToken(user.ID)
	if err != nil {
		return nil, err
	}

	return &dto.LoginResponse{
		AccessToken: token,
	}, nil
}

func (s *authService) ValidateToken(tokenStr string) (*Claims, error) {
	claims := &Claims{}

	token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return s.jwtSecret, nil
	})

	if err != nil || !token.Valid {
		return nil, errors.New("invalid or expired token")
	}

	return claims, nil
}

func (s *authService) generateToken(userID uuid.UUID) (string, error) {
	claims := &Claims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(s.tokenTTL)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(s.jwtSecret)

	if err != nil {
		return "", fmt.Errorf("signing token: %w", err)
	}

	return signed, nil
}
