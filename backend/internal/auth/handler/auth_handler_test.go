package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/octguy/bakerio/backend/internal/auth/dto"
	"github.com/octguy/bakerio/backend/internal/auth/service"
	"github.com/octguy/bakerio/backend/internal/platform/logger"
	"github.com/octguy/bakerio/backend/internal/platform/middleware"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/suite"
)

// --- 1. MOCKS ---

type MockAuthService struct {
	mock.Mock
}

func (m *MockAuthService) Register(ctx context.Context, req dto.RegisterRequest) (dto.RegisterResponse, error) {
	args := m.Called(ctx, req)
	return args.Get(0).(dto.RegisterResponse), args.Error(1)
}

func (m *MockAuthService) Login(ctx context.Context, req dto.LoginRequest) (dto.LoginResponse, error) {
	args := m.Called(ctx, req)
	return args.Get(0).(dto.LoginResponse), args.Error(1)
}

func (m *MockAuthService) ValidateToken(tokenStr string) (*service.Claims, error) {
	return nil, nil
}

func (m *MockAuthService) VerifyEmail(ctx context.Context, req dto.VerifyEmailRequest) (dto.VerifyEmailResponse, error) {
	args := m.Called(ctx, req)
	return args.Get(0).(dto.VerifyEmailResponse), args.Error(1)
}

func (m *MockAuthService) Logout(ctx context.Context, jti string, expiresAt time.Time) error {
	args := m.Called(ctx, jti, expiresAt)
	return args.Error(0)
}

func (m *MockAuthService) IsRevoked(ctx context.Context, jti string) (bool, error) {
	return false, nil
}

func (m *MockAuthService) ChangePassword(ctx context.Context, userID uuid.UUID, currentPw, newPw string) error {
	args := m.Called(ctx, userID, currentPw, newPw)
	return args.Error(0)
}

func (m *MockAuthService) AdminSetPassword(ctx context.Context, targetUserID uuid.UUID, newPw string) error {
	return nil
}

func (m *MockAuthService) CreateStaff(ctx context.Context, email, fullName, password, roleName string, branchID *uuid.UUID) (dto.RegisterResponse, error) {
	return dto.RegisterResponse{}, nil
}

func (m *MockAuthService) UpdateUserBranchID(ctx context.Context, userID uuid.UUID, branchID *uuid.UUID) error {
	args := m.Called(ctx, userID, branchID)
	return args.Error(0)
}

// --- 2. TEST SUITE ---

type AuthHandlerTestSuite struct {
	suite.Suite
	mockSvc *MockAuthService
	router  *gin.Engine
}

func (s *AuthHandlerTestSuite) SetupSuite() {
	_ = logger.Init("development")
}

func (s *AuthHandlerTestSuite) SetupTest() {
	gin.SetMode(gin.TestMode)
	s.mockSvc = new(MockAuthService)
	h := NewAuthHandler(s.mockSvc)
	
	s.router = gin.New()
	public := s.router.Group("/api/v1")
	protected := s.router.Group("/api/v1")
	h.RegisterRoutes(public, protected)
}

// --- 3. TEST METHODS ---

func (s *AuthHandlerTestSuite) TestRegister() {
	req := dto.RegisterRequest{
		Email:    "test@example.com",
		Password: "password123",
		FullName: "Test User",
	}
	body, _ := json.Marshal(req)

	s.Run("Success", func() {
		expectedRes := dto.RegisterResponse{
			ID:    uuid.New(),
			Email: req.Email,
		}
		s.mockSvc.On("Register", mock.Anything, req).Return(expectedRes, nil).Once()

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("POST", "/api/v1/auth/register", bytes.NewBuffer(body))
		s.router.ServeHTTP(w, r)

		s.Equal(http.StatusCreated, w.Code)
		
		var res struct {
			Data map[string]any `json:"data"`
		}
		json.Unmarshal(w.Body.Bytes(), &res)
		s.Equal(req.Email, res.Data["email"])
	})

	s.Run("Validation Error", func() {
		invalidBody := []byte(`{"email": "invalid"}`)
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("POST", "/api/v1/auth/register", bytes.NewBuffer(invalidBody))
		s.router.ServeHTTP(w, r)

		s.Equal(http.StatusUnprocessableEntity, w.Code)
	})
}

func (s *AuthHandlerTestSuite) TestLogin() {
	req := dto.LoginRequest{
		Email:    "test@example.com",
		Password: "password123",
	}
	body, _ := json.Marshal(req)

	s.Run("Success", func() {
		expectedRes := dto.LoginResponse{AccessToken: "fake-jwt"}
		s.mockSvc.On("Login", mock.Anything, req).Return(expectedRes, nil).Once()

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("POST", "/api/v1/auth/login", bytes.NewBuffer(body))
		s.router.ServeHTTP(w, r)

		s.Equal(http.StatusOK, w.Code)
	})
}

func (s *AuthHandlerTestSuite) TestLogout() {
	s.Run("Success", func() {
		jti := "test-jti"
		exp := time.Now().Add(time.Hour)
		
		s.mockSvc.On("Logout", mock.Anything, jti, mock.Anything).Return(nil).Once()

		w := httptest.NewRecorder()
		
		s.router.POST("/test-logout", func(c *gin.Context) {
			c.Set(middleware.JTIKey, jti)
			c.Set(middleware.ExpiresAtKey, exp)
			h := NewAuthHandler(s.mockSvc)
			h.Logout(c)
		})
		
		r, _ := http.NewRequest("POST", "/test-logout", nil)
		s.router.ServeHTTP(w, r)

		s.Equal(http.StatusNoContent, w.Code)
	})
}

func TestAuthHandlerSuite(t *testing.T) {
	suite.Run(t, new(AuthHandlerTestSuite))
}
