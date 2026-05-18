package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/octguy/bakerio/backend/internal/branch/dto"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/suite"
)

type MockBranchService struct {
	mock.Mock
}

func (m *MockBranchService) CreateBranch(ctx context.Context, req dto.CreateBranchRequest) (dto.BranchResponse, error) {
	args := m.Called(ctx, req)
	return args.Get(0).(dto.BranchResponse), args.Error(1)
}

func (m *MockBranchService) GetBranchByID(ctx context.Context, id uuid.UUID) (dto.BranchResponse, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(dto.BranchResponse), args.Error(1)
}

func (m *MockBranchService) GetAllBranches(ctx context.Context) ([]dto.BranchResponse, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]dto.BranchResponse), args.Error(1)
}

func (m *MockBranchService) UpdateBranch(ctx context.Context, id uuid.UUID, req dto.UpdateBranchRequest) (dto.BranchResponse, error) {
	args := m.Called(ctx, id, req)
	return args.Get(0).(dto.BranchResponse), args.Error(1)
}

func (m *MockBranchService) UpdateBranchStatus(ctx context.Context, id uuid.UUID, status string) error {
	args := m.Called(ctx, id, status)
	return args.Error(0)
}

func (m *MockBranchService) DeleteBranch(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

type BranchHandlerTestSuite struct {
	suite.Suite
	mockSvc *MockBranchService
	handler *BranchHandler
	router  *gin.Engine
}

func (s *BranchHandlerTestSuite) SetupTest() {
	gin.SetMode(gin.TestMode)
	s.mockSvc = new(MockBranchService)
	s.handler = NewBranchHandler(s.mockSvc)
	s.router = gin.New()

	group := s.router.Group("/branch")
	group.POST("", s.handler.CreateBranch)
	group.GET("/:id", s.handler.GetBranchByID)
}

func (s *BranchHandlerTestSuite) TestCreateBranch() {
	req := dto.CreateBranchRequest{Name: "Main Street", Address: "123 Main St", Region: "south"}
	resp := dto.BranchResponse{ID: uuid.New(), Name: "Main Street"}

	s.Run("Success", func() {
		s.mockSvc.On("CreateBranch", mock.Anything, req).Return(resp, nil).Once()

		body, _ := json.Marshal(req)
		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodPost, "/branch", bytes.NewBuffer(body))
		s.router.ServeHTTP(w, r)

		s.Equal(http.StatusCreated, w.Code)
		s.mockSvc.AssertExpectations(s.T())
	})
}

func TestBranchHandlerSuite(t *testing.T) {
	suite.Run(t, new(BranchHandlerTestSuite))
}
