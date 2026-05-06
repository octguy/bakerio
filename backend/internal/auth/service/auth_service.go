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
	"github.com/octguy/bakerio/backend/internal/platform/cache"
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
	ErrNoBranchAssigned   = apperrors.NotFound("no branch assigned")
)

var storeLevelRoles = map[string]bool{
    "store_manager": true,
    "staff_cashier": true,
    "baker":         true,
    "shipper":       true,
}

type Claims struct {
	UserID uuid.UUID `json:"user_id"`
	Roles  []string  `json:"roles"`
	BranchID *uuid.UUID	 `json:"branch_id,omitempty"` // nil for HQ and customer roles
	jwt.RegisteredClaims
}

const blacklistPrefix = "auth:blacklist:"

type AuthService interface {
	Register(ctx context.Context, req dto.RegisterRequest) (dto.RegisterResponse, error)
	Login(ctx context.Context, req dto.LoginRequest) (dto.LoginResponse, error)
	ValidateToken(tokenStr string) (*Claims, error)
	VerifyEmail(ctx context.Context, req dto.VerifyEmailRequest) (dto.VerifyEmailResponse, error)
	Logout(ctx context.Context, jti string, expiresAt time.Time) error
	IsRevoked(ctx context.Context, jti string) (bool, error)
	ChangePassword(ctx context.Context, userID uuid.UUID, currentPw, newPw string) error
	AdminSetPassword(ctx context.Context, targetUserID uuid.UUID, newPw string) error
	CreateStaff(ctx context.Context, email, fullName, password, roleName string) (dto.RegisterResponse, error)
}

type authService struct {
	repo       repository.AuthRepository
	rbacSvc    RBACService
	profileSvc profileSvc.ProfileService
	outboxRepo *outbox.Repository
	otpSvc     *otp.Service
	tx         *txmanager.TxManager
	redis      *cache.Client
	jwtSecret  []byte
	tokenTTL   time.Duration
}

func NewAuthService(
	repo repository.AuthRepository,
	rbacSvc RBACService,
	redis *cache.Client,
	tx *txmanager.TxManager,
	profSvc profileSvc.ProfileService,
	outboxRepo *outbox.Repository,
	otpSvc *otp.Service,
	jwtSecret string,
	tokenTTL time.Duration) AuthService {
	return &authService{
		repo:       repo,
		rbacSvc:    rbacSvc,
		redis:      redis,
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

	isStoreLevelStaff := false
	for _, r := range roles {
		if storeLevelRoles[r] {
			isStoreLevelStaff = true
			break
		}
	}

	var branchID *uuid.UUID
	if isStoreLevelStaff {
		id,err := s.repo.GetUserBranchID(ctx, user.ID)
		if err != nil || id == nil {
			logger.Log.Error("login: store-level user has no branch assignment", zap.String("email", req.Email), zap.Error(err))
			return dto.LoginResponse{}, ErrNoBranchAssigned
		}
		branchID = id
	}

	token, err := s.generateToken(user.ID, roles, branchID)
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

func (s *authService) Logout(ctx context.Context, jti string, expiresAt time.Time) error {
	ttl := time.Until(expiresAt)
	if ttl <= 0 {
		return nil
	}
	return s.redis.Set(ctx, blacklistPrefix+jti, "1", ttl)
}

func (s *authService) IsRevoked(ctx context.Context, jti string) (bool, error) {
	val, err := s.redis.Get(ctx, blacklistPrefix+jti)
	if err != nil {
		// redis.Nil means key not found — token is not revoked
		return false, nil
	}
	return val == "1", nil
}

func (s *authService) ChangePassword(ctx context.Context, userID uuid.UUID, currentPw, newPw string) error {
	hash, err := s.repo.GetCredentialsByUserID(ctx, userID)
	if err != nil {
		return apperrors.NotFound("user not found")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(currentPw)); err != nil {
		return apperrors.Unauthorized("current password is incorrect")
	}
	newHash, err := bcrypt.GenerateFromPassword([]byte(newPw), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	return s.repo.UpdatePassword(ctx, userID, string(newHash))
}

func (s *authService) AdminSetPassword(ctx context.Context, targetUserID uuid.UUID, newPw string) error {
	newHash, err := bcrypt.GenerateFromPassword([]byte(newPw), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	return s.repo.UpdatePassword(ctx, targetUserID, string(newHash))
}

func (s *authService) CreateStaff(ctx context.Context, email, fullName, password, roleName string) (dto.RegisterResponse, error) {
	_, err := s.repo.FindUserByEmail(ctx, email)
	if err == nil {
		return dto.RegisterResponse{}, ErrEmailTaken
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return dto.RegisterResponse{}, err
	}

	var user *domain.User

	err = s.tx.WithTx(ctx, func(txCtx context.Context) error {
		user, err = s.repo.CreateAccount(txCtx, email, string(hashed))
		if err != nil {
			return err
		}

		// Staff accounts are created active + verified — no email OTP needed
		if err = s.repo.ActivateUser(txCtx, user.ID); err != nil {
			return err
		}

		if _, err = s.profileSvc.CreateProfile(txCtx, user.ID, nil, nil, fullName); err != nil {
			return err
		}

		return s.rbacSvc.AssignRole(txCtx, user.ID, roleName)
	})
	if err != nil {
		return dto.RegisterResponse{}, err
	}

	logger.Log.Info("create staff: account created", zap.String("email", email), zap.String("role", roleName))

	return dto.RegisterResponse{
		ID:        user.ID,
		Email:     user.Email,
		FullName:  fullName,
		CreatedAt: user.CreatedAt,
	}, nil
}

func (s *authService) generateToken(userID uuid.UUID, roles []string, branchID *uuid.UUID) (string, error) {
	claims := &Claims{
		UserID: userID,
		Roles:  roles,
		BranchID: branchID,
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        uuid.New().String(),
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
