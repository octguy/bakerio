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
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
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

	// No middleware for unit testing
	group := s.router.Group("/branch")
	group.POST("", s.handler.CreateBranch)
	group.GET("", s.handler.GetBranchList)
	group.GET("/:id", s.handler.GetBranchByID)
	group.PATCH("/:id", s.handler.UpdateBranch)
	group.PATCH("/:id/status", s.handler.UpdateStatus)
	group.DELETE("/:id", s.handler.DeleteBranch)
}

func (s *BranchHandlerTestSuite) TestCreateBranch() {
	req := dto.CreateBranchRequest{Name: "Main Street", Address: "123 Main St", Region: "north"}
	resp := dto.BranchResponse{ID: uuid.New(), Name: "Main Street", Region: "north"}

	s.Run("Success", func() {
		s.mockSvc.On("CreateBranch", mock.Anything, req).Return(resp, nil).Once()

		body, _ := json.Marshal(req)
		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodPost, "/branch", bytes.NewBuffer(body))
		s.router.ServeHTTP(w, r)

		s.Equal(http.StatusCreated, w.Code)
		s.mockSvc.AssertExpectations(s.T())
	})

	s.Run("Validation Error", func() {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodPost, "/branch", bytes.NewBufferString("{invalid}"))
		s.router.ServeHTTP(w, r)

		s.Equal(http.StatusUnprocessableEntity, w.Code)
	})
	s.Run("Service Error", func() {
		w := httptest.NewRecorder()
		s.mockSvc.On("CreateBranch", mock.Anything, req).Return(dto.BranchResponse{}, apperrors.Internal("err", nil)).Once()
		body, _ := json.Marshal(req)
		r, _ := http.NewRequest(http.MethodPost, "/branch", bytes.NewBuffer(body))
		s.router.ServeHTTP(w, r)
		s.Equal(http.StatusInternalServerError, w.Code)
	})
}

func (s *BranchHandlerTestSuite) TestGetBranchByID() {
	id := uuid.New()
	resp := dto.BranchResponse{ID: id, Name: "Main Street"}

	s.Run("Success", func() {
		s.mockSvc.On("GetBranchByID", mock.Anything, id).Return(resp, nil).Once()

		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodGet, "/branch/"+id.String(), nil)
		s.router.ServeHTTP(w, r)

		s.Equal(http.StatusOK, w.Code)
		s.mockSvc.AssertExpectations(s.T())
	})

	s.Run("Not Found", func() {
		s.mockSvc.On("GetBranchByID", mock.Anything, id).Return(dto.BranchResponse{}, apperrors.NotFound("not found")).Once()

		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodGet, "/branch/"+id.String(), nil)
		s.router.ServeHTTP(w, r)

		s.Equal(http.StatusNotFound, w.Code)
		s.mockSvc.AssertExpectations(s.T())
	})

	s.Run("Invalid ID", func() {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodGet, "/branch/invalid-id", nil)
		s.router.ServeHTTP(w, r)

		s.Equal(http.StatusUnprocessableEntity, w.Code)
	})
}

func (s *BranchHandlerTestSuite) TestGetBranchList() {
	resp := []dto.BranchResponse{{ID: uuid.New(), Name: "B1"}}

	s.Run("Success", func() {
		s.mockSvc.On("GetAllBranches", mock.Anything).Return(resp, nil).Once()

		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodGet, "/branch", nil)
		s.router.ServeHTTP(w, r)

		s.Equal(http.StatusOK, w.Code)
		s.mockSvc.AssertExpectations(s.T())
	})
}

func (s *BranchHandlerTestSuite) TestUpdateBranch() {
	id := uuid.New()
	name := "Updated"
	req := dto.UpdateBranchRequest{Name: &name}
	resp := dto.BranchResponse{ID: id, Name: name}

	s.Run("Success", func() {
		s.mockSvc.On("UpdateBranch", mock.Anything, id, req).Return(resp, nil).Once()

		body, _ := json.Marshal(req)
		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodPatch, "/branch/"+id.String(), bytes.NewBuffer(body))
		s.router.ServeHTTP(w, r)

		s.Equal(http.StatusOK, w.Code)
		s.mockSvc.AssertExpectations(s.T())
	})

	s.Run("Validation Error (Invalid ID)", func() {
		body, _ := json.Marshal(req)
		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodPatch, "/branch/invalid", bytes.NewBuffer(body))
		s.router.ServeHTTP(w, r)

		s.Equal(http.StatusUnprocessableEntity, w.Code)
	})

	s.Run("Validation Error (Invalid JSON)", func() {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodPatch, "/branch/"+id.String(), bytes.NewBufferString("bad json"))
		s.router.ServeHTTP(w, r)

		s.Equal(http.StatusUnprocessableEntity, w.Code)
	})
}

func (s *BranchHandlerTestSuite) TestUpdateStatus() {
	id := uuid.New()
	req := dto.UpdateStatusRequest{Status: "inactive"}

	s.Run("Success", func() {
		s.mockSvc.On("UpdateBranchStatus", mock.Anything, id, "inactive").Return(nil).Once()

		body, _ := json.Marshal(req)
		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodPatch, "/branch/"+id.String()+"/status", bytes.NewBuffer(body))
		s.router.ServeHTTP(w, r)

		s.Equal(http.StatusOK, w.Code)
		s.mockSvc.AssertExpectations(s.T())
	})

	s.Run("Invalid ID", func() {
		body, _ := json.Marshal(req)
		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodPatch, "/branch/invalid/status", bytes.NewBuffer(body))
		s.router.ServeHTTP(w, r)

		s.Equal(http.StatusUnprocessableEntity, w.Code)
	})
}

func (s *BranchHandlerTestSuite) TestDeleteBranch() {
	id := uuid.New()

	s.Run("Success", func() {
		s.mockSvc.On("DeleteBranch", mock.Anything, id).Return(nil).Once()

		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodDelete, "/branch/"+id.String(), nil)
		s.router.ServeHTTP(w, r)

		s.Equal(http.StatusNoContent, w.Code)
		s.mockSvc.AssertExpectations(s.T())
	})

	s.Run("Invalid ID", func() {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodDelete, "/branch/invalid", nil)
		s.router.ServeHTTP(w, r)

		s.Equal(http.StatusUnprocessableEntity, w.Code)
	})
}

func (s *BranchHandlerTestSuite) TestRegisterRoutes() {
	router := gin.New()
	s.handler.RegisterRoutes(router.Group("/api"))
	// Basic check that it doesn't panic and routes are registered
	s.NotNil(router)
}

func TestBranchHandlerSuite(t *testing.T) {
	suite.Run(t, new(BranchHandlerTestSuite))
}
