package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/octguy/bakerio/backend/internal/auth/dto"
	"github.com/octguy/bakerio/backend/internal/auth/repository"
	"github.com/octguy/bakerio/backend/internal/platform/logger"
	"github.com/octguy/bakerio/backend/internal/platform/otp"
	"github.com/octguy/bakerio/backend/internal/platform/outbox"
	profileSvc "github.com/octguy/bakerio/backend/internal/profile/service"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
	"github.com/octguy/bakerio/backend/internal/shared/event"
	"github.com/octguy/bakerio/backend/pkg/txmanager"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials = apperrors.Unauthorized("invalid credentials")
	ErrEmailTaken         = apperrors.Conflict("email already taken")
	InvalidOTP            = apperrors.Unauthorized("invalid otp")
	UserNotFound          = apperrors.NotFound("user not found")
)

type Claims struct {
	UserID uuid.UUID `json:"user_id"`
	Roles  []string  `json:"roles"`
	jwt.RegisteredClaims
}

type AuthService interface {
	Register(ctx context.Context, req dto.RegisterRequest) (dto.RegisterResponse, error)
	Login(ctx context.Context, req dto.LoginRequest) (dto.LoginResponse, error)
	ValidateToken(tokenStr string) (*Claims, error)
	VerifyEmail(ctx context.Context, req dto.VerifyEmailRequest) (dto.VerifyEmailResponse, error)
}

type authService struct {
	repo       repository.AuthRepository
	rbacSvc    RBACService
	profileSvc profileSvc.ProfileService
	outboxRepo *outbox.Repository
	otpSvc     *otp.Service
	tx         *txmanager.TxManager
	jwtSecret  []byte
	tokenTTL   time.Duration
}

func NewAuthService(
	repo repository.AuthRepository,
	rbacSvc RBACService,
	tx *txmanager.TxManager,
	profSvc profileSvc.ProfileService,
	outboxRepo *outbox.Repository,
	otpSvc *otp.Service,
	jwtSecret string,
	tokenTTL time.Duration) AuthService {
	return &authService{
		repo:       repo,
		rbacSvc:    rbacSvc,
		tx:         tx,
		profileSvc: profSvc,
		outboxRepo: outboxRepo,
		otpSvc:     otpSvc,
		jwtSecret:  []byte(jwtSecret),
		tokenTTL:   tokenTTL,
	}
}

func (s *authService) Register(ctx context.Context, req dto.RegisterRequest) (dto.RegisterResponse, error) {
	_, err := s.repo.FindUserByEmail(ctx, req.Email)
	if err == nil {
		logger.Log.Warn("register: email already taken", zap.String("email", req.Email))
		return dto.RegisterResponse{}, ErrEmailTaken
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		logger.Log.Error("register: failed to hash password", zap.Error(err))
		return dto.RegisterResponse{}, err
	}

	var user *domain.User

	err = s.tx.WithTx(ctx, func(txCtx context.Context) error {
		user, err = s.repo.CreateAccount(txCtx, req.Email, string(hashed))
		if err != nil {
			logger.Log.Error("register: failed to create account", zap.String("email", req.Email), zap.Error(err))
			return err
		}

		logger.Log.Debug("register: account created", zap.String("user_id", user.ID.String()))

		_, err := s.profileSvc.CreateProfile(txCtx, user.ID, nil, nil, req.FullName)
		if err != nil {
			logger.Log.Error("register: failed to create profile", zap.String("user_id", user.ID.String()), zap.Error(err))
			return err
		}

		if err = s.rbacSvc.AssignMemberRole(txCtx, user.ID); err != nil {
			logger.Log.Error("register: failed to assign member role", zap.String("user_id", user.ID.String()), zap.Error(err))
			return err
		}

		err = s.outboxRepo.Save(txCtx, event.UserRegistered, event.UserRegisteredPayload{
			UserID:      user.ID,
			Email:       user.Email,
			DisplayName: req.FullName,
		})

		if err != nil {
			logger.Log.Error("register: failed to save out box when create user", zap.String("user_id", user.ID.String()), zap.Error(err))
			return err
		}

		logger.Log.Debug("register: profile created", zap.String("user_id", user.ID.String()))
		return nil
	})

	if err != nil {
		return dto.RegisterResponse{}, err
	}

	logger.Log.Info("register: user registered successfully", zap.String("user_id", user.ID.String()), zap.String("email", user.Email))

	return dto.RegisterResponse{
		ID:        user.ID,
		Email:     user.Email,
		FullName:  req.FullName,
		CreatedAt: user.CreatedAt,
	}, nil
}

func (s *authService) Login(ctx context.Context, req dto.LoginRequest) (dto.LoginResponse, error) {
	user, err := s.repo.FindUserWithCredentialsByEmail(ctx, req.Email)
	if err != nil {
		logger.Log.Warn("login: user not found", zap.String("email", req.Email), zap.Error(err))
		return dto.LoginResponse{}, ErrInvalidCredentials
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		logger.Log.Warn("login: invalid password", zap.String("email", req.Email))
		return dto.LoginResponse{}, ErrInvalidCredentials
	}

	roles, err := s.rbacSvc.GetUserRoles(ctx, user.ID)
	if err != nil {
		logger.Log.Error("login: failed to load user roles", zap.String("email", req.Email), zap.Error(err))
		return dto.LoginResponse{}, err
	}

	token, err := s.generateToken(user.ID, roles)
	if err != nil {
		logger.Log.Error("login: failed to generate token", zap.String("email", req.Email), zap.Error(err))
		return dto.LoginResponse{}, err
	}

	return dto.LoginResponse{
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

func (s *authService) VerifyEmail(ctx context.Context, req dto.VerifyEmailRequest) (dto.VerifyEmailResponse, error) {
	_, err := s.repo.FindUserByID(ctx, req.UserId)
	if err != nil {
		logger.Log.Error("verify: user not found", zap.String("id", req.UserId.String()), zap.Error(err))
		return dto.VerifyEmailResponse{
			Verified: false,
			Message:  "user not found",
		}, UserNotFound
	}

	validOtp, err := s.otpSvc.Verify(ctx, req.UserId.String(), req.OTP)
	if err != nil || !validOtp {
		logger.Log.Error("verify: otp failed", zap.String("id", req.UserId.String()), zap.Error(err))
		return dto.VerifyEmailResponse{
			Verified: false,
			Message:  "otp failed",
		}, InvalidOTP
	}

	err = s.repo.ActivateUser(ctx, req.UserId)
	if err != nil {
		logger.Log.Error("verify: failed to activate user", zap.String("id", req.UserId.String()), zap.Error(err))
		return dto.VerifyEmailResponse{
			Verified: false,
			Message:  "otp failed",
		}, err
	}

	logger.Log.Debug("verify: user activated", zap.String("id", req.UserId.String()))

	return dto.VerifyEmailResponse{
		Verified: true,
		Message:  "verified successful",
	}, nil
}

func (s *authService) generateToken(userID uuid.UUID, roles []string) (string, error) {
	claims := &Claims{
		UserID: userID,
		Roles:  roles,
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
