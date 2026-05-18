package service

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	authdb "github.com/octguy/bakerio/backend/db/sqlc/auth"
	"github.com/octguy/bakerio/backend/internal/auth/dto"
	branchdto "github.com/octguy/bakerio/backend/internal/branch/dto"
	"github.com/octguy/bakerio/backend/internal/platform/logger"
	"github.com/octguy/bakerio/backend/internal/platform/outbox"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/suite"
	"golang.org/x/crypto/bcrypt"
)

// --- 1. MOCKS ---

type MockAuthRepo struct {
	mock.Mock
}

func (m *MockAuthRepo) CreateAccount(ctx context.Context, email, passwordHash string, branchID *uuid.UUID) (*domain.User, error) {
	args := m.Called(ctx, email, passwordHash, branchID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.User), args.Error(1)
}

func (m *MockAuthRepo) FindUserByEmail(ctx context.Context, email string) (*domain.User, error) {
	args := m.Called(ctx, email)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.User), args.Error(1)
}

func (m *MockAuthRepo) FindUserWithCredentialsByEmail(ctx context.Context, email string) (authdb.GetUserWithCredentialsByEmailRow, error) {
	args := m.Called(ctx, email)
	return args.Get(0).(authdb.GetUserWithCredentialsByEmailRow), args.Error(1)
}

func (m *MockAuthRepo) FindUserByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.User), args.Error(1)
}

func (m *MockAuthRepo) ActivateUser(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockAuthRepo) GetUserBranchID(ctx context.Context, id uuid.UUID) (*uuid.UUID, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*uuid.UUID), args.Error(1)
}

func (m *MockAuthRepo) GetCredentialsByUserID(ctx context.Context, userID uuid.UUID) (string, error) {
	args := m.Called(ctx, userID)
	return args.String(0), args.Error(1)
}

func (m *MockAuthRepo) UpdatePassword(ctx context.Context, userID uuid.UUID, newHash string) error {
	args := m.Called(ctx, userID, newHash)
	return args.Error(0)
}

type MockRBACService struct {
	mock.Mock
}

func (m *MockRBACService) GetUserRoles(ctx context.Context, userID uuid.UUID) ([]string, error) {
	args := m.Called(ctx, userID)
	return args.Get(0).([]string), args.Error(1)
}

func (m *MockRBACService) AssignMemberRole(ctx context.Context, userID uuid.UUID) error {
	args := m.Called(ctx, userID)
	return args.Error(0)
}

func (m *MockRBACService) ResolvePermissions(ctx context.Context, roles []string) ([]string, error) {
	args := m.Called(ctx, roles)
	return args.Get(0).([]string), args.Error(1)
}

func (m *MockRBACService) WarmPermissionCache(ctx context.Context) error {
	args := m.Called(ctx)
	return args.Error(0)
}

func (m *MockRBACService) AssignRole(ctx context.Context, userID uuid.UUID, roleName string) error {
	args := m.Called(ctx, userID, roleName)
	return args.Error(0)
}

func (m *MockRBACService) RemoveRole(ctx context.Context, userID uuid.UUID, roleName string) error {
	args := m.Called(ctx, userID, roleName)
	return args.Error(0)
}

type MockProfileCreator struct {
	mock.Mock
}

func (m *MockProfileCreator) CreateProfile(ctx context.Context, userID uuid.UUID, avatarURL, bio *string, fullName string) error {
	args := m.Called(ctx, userID, avatarURL, bio, fullName)
	return args.Error(0)
}

type MockBranchValidator struct {
	mock.Mock
}

func (m *MockBranchValidator) GetBranchByID(ctx context.Context, id uuid.UUID) (branchdto.BranchResponse, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(branchdto.BranchResponse), args.Error(1)
}

type MockOutboxSource struct {
	mock.Mock
}

func (m *MockOutboxSource) Save(ctx context.Context, routingKey string, payload any) error {
	args := m.Called(ctx, routingKey, payload)
	return args.Error(0)
}

func (m *MockOutboxSource) FetchUnpublished(ctx context.Context, limit int) ([]outbox.Event, error) {
	args := m.Called(ctx, limit)
	return args.Get(0).([]outbox.Event), args.Error(1)
}

func (m *MockOutboxSource) MarkPublished(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

type MockOTPService struct {
	mock.Mock
}

func (m *MockOTPService) Generate(ctx context.Context, userID string) (string, error) {
	args := m.Called(ctx, userID)
	return args.String(0), args.Error(1)
}

func (m *MockOTPService) Verify(ctx context.Context, userID, submitted string) (bool, error) {
	args := m.Called(ctx, userID, submitted)
	return args.Bool(0), args.Error(1)
}

type MockCache struct {
	mock.Mock
}

func (m *MockCache) Set(ctx context.Context, key string, value string, ttl time.Duration) error {
	args := m.Called(ctx, key, value, ttl)
	return args.Error(0)
}

func (m *MockCache) Get(ctx context.Context, key string) (string, error) {
	args := m.Called(ctx, key)
	return args.String(0), args.Error(1)
}

func (m *MockCache) Del(ctx context.Context, key string) error {
	args := m.Called(ctx, key)
	return args.Error(0)
}

func (m *MockCache) Close() error {
	args := m.Called()
	return args.Error(0)
}

type NoOpTxManager struct{}

func (m *NoOpTxManager) WithTx(ctx context.Context, fn func(ctx context.Context) error) error {
	return fn(ctx)
}

// --- 2. TEST SUITE ---

type AuthServiceTestSuite struct {
	suite.Suite
	mockRepo       *MockAuthRepo
	mockRBAC       *MockRBACService
	mockProfile    *MockProfileCreator
	mockBranch     *MockBranchValidator
	mockOutbox     *MockOutboxSource
	mockOTP        *MockOTPService
	mockCache      *MockCache
	service        AuthService
	jwtSecret      string
}

func (s *AuthServiceTestSuite) SetupSuite() {
	_ = logger.Init("development")
}

func (s *AuthServiceTestSuite) SetupTest() {
	s.mockRepo = new(MockAuthRepo)
	s.mockRBAC = new(MockRBACService)
	s.mockProfile = new(MockProfileCreator)
	s.mockBranch = new(MockBranchValidator)
	s.mockOutbox = new(MockOutboxSource)
	s.mockOTP = new(MockOTPService)
	s.mockCache = new(MockCache)
	s.jwtSecret = "test-secret"

	s.service = NewAuthService(
		s.mockRepo,
		s.mockRBAC,
		s.mockCache,
		&NoOpTxManager{},
		s.mockProfile,
		s.mockBranch,
		s.mockOutbox,
		s.mockOTP,
		s.jwtSecret,
		time.Hour,
	)
}

// --- 3. TEST METHODS ---

func (s *AuthServiceTestSuite) TestRegister() {
	ctx := context.Background()
	req := dto.RegisterRequest{
		Email:    "test@example.com",
		Password: "password123",
		FullName: "Test User",
	}

	s.Run("Success", func() {
		s.mockRepo.On("FindUserByEmail", ctx, req.Email).Return(nil, apperrors.NotFound("not found")).Once()
		s.mockRepo.On("CreateAccount", mock.Anything, req.Email, mock.Anything, (*uuid.UUID)(nil)).Return(&domain.User{
			ID:    uuid.New(),
			Email: req.Email,
		}, nil).Once()
		s.mockProfile.On("CreateProfile", mock.Anything, mock.Anything, (*string)(nil), (*string)(nil), req.FullName).Return(nil).Once()
		s.mockRBAC.On("AssignMemberRole", mock.Anything, mock.Anything).Return(nil).Once()
		s.mockOutbox.On("Save", mock.Anything, mock.Anything, mock.Anything).Return(nil).Once()

		res, err := s.service.Register(ctx, req)

		s.NoError(err)
		s.Equal(req.Email, res.Email)
		s.mockRepo.AssertExpectations(s.T())
		s.mockProfile.AssertExpectations(s.T())
		s.mockRBAC.AssertExpectations(s.T())
		s.mockOutbox.AssertExpectations(s.T())
	})

	s.Run("Email Taken", func() {
		s.mockRepo.On("FindUserByEmail", ctx, req.Email).Return(&domain.User{}, nil).Once()

		_, err := s.service.Register(ctx, req)

		s.Error(err)
		s.Equal(ErrEmailTaken, err)
	})
}

func (s *AuthServiceTestSuite) TestLogin() {
	ctx := context.Background()
	password := "password123"
	hash, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	
	req := dto.LoginRequest{
		Email:    "test@example.com",
		Password: password,
	}

	userID := uuid.New()
	userRow := authdb.GetUserWithCredentialsByEmailRow{
		ID:           userID,
		Email:        req.Email,
		PasswordHash: string(hash),
	}

	s.Run("Success", func() {
		s.mockRepo.On("FindUserWithCredentialsByEmail", ctx, req.Email).Return(userRow, nil).Once()
		s.mockRBAC.On("GetUserRoles", ctx, userID).Return([]string{"member"}, nil).Once()

		res, err := s.service.Login(ctx, req)

		s.NoError(err)
		s.NotEmpty(res.AccessToken)
		s.mockRepo.AssertExpectations(s.T())
		s.mockRBAC.AssertExpectations(s.T())
	})

	s.Run("Invalid Credentials", func() {
		s.mockRepo.On("FindUserWithCredentialsByEmail", ctx, req.Email).Return(userRow, nil).Once()
		
		invalidReq := dto.LoginRequest{
			Email:    req.Email,
			Password: "wrongpassword",
		}
		_, err := s.service.Login(ctx, invalidReq)

		s.Error(err)
		s.Equal(ErrInvalidCredentials, err)
	})

	s.Run("Store Staff Missing Branch", func() {
		s.mockRepo.On("FindUserWithCredentialsByEmail", ctx, req.Email).Return(userRow, nil).Once()
		s.mockRBAC.On("GetUserRoles", ctx, userID).Return([]string{"store_manager"}, nil).Once()
		s.mockRepo.On("GetUserBranchID", ctx, userID).Return((*uuid.UUID)(nil), nil).Once()

		_, err := s.service.Login(ctx, req)

		s.Error(err)
		s.Equal(ErrNoBranchAssigned, err)
	})
}

func (s *AuthServiceTestSuite) TestLogout() {
	ctx := context.Background()
	jti := "test-jti"
	expiresAt := time.Now().Add(time.Hour)

	s.mockCache.On("Set", ctx, blacklistPrefix+jti, "1", mock.Anything).Return(nil).Once()

	err := s.service.Logout(ctx, jti, expiresAt)

	s.NoError(err)
	s.mockCache.AssertExpectations(s.T())
}

func (s *AuthServiceTestSuite) TestIsRevoked() {
	ctx := context.Background()
	jti := "test-jti"

	s.Run("Not Revoked", func() {
		s.mockCache.On("Get", ctx, blacklistPrefix+jti).Return("", apperrors.NotFound("not found")).Once()
		revoked, err := s.service.IsRevoked(ctx, jti)
		s.NoError(err)
		s.False(revoked)
	})

	s.Run("Revoked", func() {
		s.mockCache.On("Get", ctx, blacklistPrefix+jti).Return("1", nil).Once()
		revoked, err := s.service.IsRevoked(ctx, jti)
		s.NoError(err)
		s.True(revoked)
	})
}

func (s *AuthServiceTestSuite) TestVerifyEmail() {
	ctx := context.Background()
	userID := uuid.New()
	otp := "123456"

	req := dto.VerifyEmailRequest{
		UserId: userID,
		OTP:    otp,
	}

	s.Run("Success", func() {
		s.mockRepo.On("FindUserByID", ctx, userID).Return(&domain.User{ID: userID}, nil).Once()
		s.mockOTP.On("Verify", ctx, userID.String(), otp).Return(true, nil).Once()
		s.mockRepo.On("ActivateUser", ctx, userID).Return(nil).Once()

		res, err := s.service.VerifyEmail(ctx, req)

		s.NoError(err)
		s.True(res.Verified)
		s.mockRepo.AssertExpectations(s.T())
		s.mockOTP.AssertExpectations(s.T())
	})

	s.Run("Invalid OTP", func() {
		s.mockRepo.On("FindUserByID", ctx, userID).Return(&domain.User{ID: userID}, nil).Once()
		s.mockOTP.On("Verify", ctx, userID.String(), otp).Return(false, nil).Once()

		res, err := s.service.VerifyEmail(ctx, req)

		s.Error(err)
		s.False(res.Verified)
		s.Equal(InvalidOTP, err)
	})
}

func (s *AuthServiceTestSuite) TestChangePassword() {
	ctx := context.Background()
	userID := uuid.New()
	currentPw := "old-password"
	newPw := "new-password"
	hash, _ := bcrypt.GenerateFromPassword([]byte(currentPw), bcrypt.DefaultCost)

	s.Run("Success", func() {
		s.mockRepo.On("GetCredentialsByUserID", ctx, userID).Return(string(hash), nil).Once()
		s.mockRepo.On("UpdatePassword", ctx, userID, mock.Anything).Return(nil).Once()

		err := s.service.ChangePassword(ctx, userID, currentPw, newPw)

		s.NoError(err)
		s.mockRepo.AssertExpectations(s.T())
	})

	s.Run("Wrong Current Password", func() {
		s.mockRepo.On("GetCredentialsByUserID", ctx, userID).Return(string(hash), nil).Once()

		err := s.service.ChangePassword(ctx, userID, "wrong-password", newPw)

		s.Error(err)
		s.Contains(err.Error(), "current password is incorrect")
	})
}

func (s *AuthServiceTestSuite) TestAdminSetPassword() {
	ctx := context.Background()
	userID := uuid.New()
	newPw := "admin-set-password"

	s.mockRepo.On("UpdatePassword", ctx, userID, mock.Anything).Return(nil).Once()

	err := s.service.AdminSetPassword(ctx, userID, newPw)

	s.NoError(err)
	s.mockRepo.AssertExpectations(s.T())
}

func (s *AuthServiceTestSuite) TestCreateStaff() {
	ctx := context.Background()
	email := "staff@example.com"
	fullName := "Staff User"
	password := "password123"
	roleName := "staff_cashier"
	branchID := uuid.New()

	s.Run("Success", func() {
		s.mockRepo.On("FindUserByEmail", ctx, email).Return(nil, apperrors.NotFound("not found")).Once()
		s.mockBranch.On("GetBranchByID", ctx, branchID).Return(branchdto.BranchResponse{ID: branchID}, nil).Once()
		s.mockRepo.On("CreateAccount", mock.Anything, email, mock.Anything, &branchID).Return(&domain.User{
			ID:    uuid.New(),
			Email: email,
		}, nil).Once()
		s.mockRepo.On("ActivateUser", mock.Anything, mock.Anything).Return(nil).Once()
		s.mockProfile.On("CreateProfile", mock.Anything, mock.Anything, (*string)(nil), (*string)(nil), fullName).Return(nil).Once()
		s.mockRBAC.On("AssignRole", mock.Anything, mock.Anything, roleName).Return(nil).Once()

		res, err := s.service.CreateStaff(ctx, email, fullName, password, roleName, &branchID)

		s.NoError(err)
		s.Equal(email, res.Email)
		s.mockRepo.AssertExpectations(s.T())
		s.mockBranch.AssertExpectations(s.T())
		s.mockProfile.AssertExpectations(s.T())
		s.mockRBAC.AssertExpectations(s.T())
	})

	s.Run("Missing Branch for Store Level Staff", func() {
		s.mockRepo.On("FindUserByEmail", ctx, email).Return(nil, apperrors.NotFound("not found")).Once()
		
		_, err := s.service.CreateStaff(ctx, email, fullName, password, roleName, nil)

		s.Error(err)
		s.Equal(ErrNoBranchAssigned, err)
	})
}

func TestAuthServiceSuite(t *testing.T) {
	suite.Run(t, new(AuthServiceTestSuite))
}
