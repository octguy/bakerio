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
	"github.com/octguy/bakerio/backend/internal/product/dto"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/suite"
)

// --- 1. MOCK SERVICE ---

type MockCategoryService struct {
	mock.Mock
}

func (m *MockCategoryService) CreateCategory(ctx context.Context, req dto.CreateCategoryRequest) (dto.CategoryResponse, error) {
	args := m.Called(ctx, req)
	return args.Get(0).(dto.CategoryResponse), args.Error(1)
}

func (m *MockCategoryService) GetCategory(ctx context.Context, id uuid.UUID) (dto.CategoryResponse, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(dto.CategoryResponse), args.Error(1)
}

func (m *MockCategoryService) ListCategories(ctx context.Context) ([]dto.CategoryResponse, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]dto.CategoryResponse), args.Error(1)
}

func (m *MockCategoryService) UpdateCategory(ctx context.Context, id uuid.UUID, req dto.UpdateCategoryRequest) (dto.CategoryResponse, error) {
	args := m.Called(ctx, id, req)
	return args.Get(0).(dto.CategoryResponse), args.Error(1)
}

func (m *MockCategoryService) DeleteCategory(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

// --- 2. TEST SUITE ---

type CategoryHandlerTestSuite struct {
	suite.Suite
	mockSvc *MockCategoryService
	handler *CategoryHandler
	router  *gin.Engine
}

func (s *CategoryHandlerTestSuite) SetupTest() {
	gin.SetMode(gin.TestMode)
	s.mockSvc = new(MockCategoryService)
	s.handler = NewCategoryHandler(s.mockSvc)
	s.router = gin.New()

	// Register routes (without middleware for simplicity in unit tests)
	group := s.router.Group("/categories")
	group.POST("", s.handler.CreateCategory)
	group.GET("/:id", s.handler.GetCategory)
	group.GET("", s.handler.ListCategories)
	group.PATCH("/:id", s.handler.UpdateCategory)
	group.DELETE("/:id", s.handler.DeleteCategory)
}

// --- 3. TEST METHODS ---

func (s *CategoryHandlerTestSuite) TestCreateCategory() {
	req := dto.CreateCategoryRequest{Name: "Breads"}
	resp := dto.CategoryResponse{ID: uuid.New(), Name: "Breads", Slug: "breads"}

	s.Run("Success", func() {
		s.mockSvc.On("CreateCategory", mock.Anything, req).Return(resp, nil).Once()

		body, _ := json.Marshal(req)
		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodPost, "/categories", bytes.NewBuffer(body))
		s.router.ServeHTTP(w, r)

		s.Equal(http.StatusCreated, w.Code)
		
		var result map[string]any
		json.Unmarshal(w.Body.Bytes(), &result)
		data := result["data"].(map[string]any)
		s.Equal(resp.Name, data["name"])
		s.mockSvc.AssertExpectations(s.T())
	})

	s.Run("Validation Error", func() {
		// Empty body or invalid JSON
		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodPost, "/categories", bytes.NewBufferString("{invalid}"))
		s.router.ServeHTTP(w, r)

		s.Equal(http.StatusUnprocessableEntity, w.Code)
	})
}

func (s *CategoryHandlerTestSuite) TestGetCategory() {
	id := uuid.New()
	resp := dto.CategoryResponse{ID: id, Name: "Breads"}

	s.Run("Success", func() {
		s.mockSvc.On("GetCategory", mock.Anything, id).Return(resp, nil).Once()

		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodGet, "/categories/"+id.String(), nil)
		s.router.ServeHTTP(w, r)

		s.Equal(http.StatusOK, w.Code)
		s.mockSvc.AssertExpectations(s.T())
	})

	s.Run("Not Found", func() {
		s.mockSvc.On("GetCategory", mock.Anything, id).Return(dto.CategoryResponse{}, apperrors.NotFound("not found")).Once()

		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodGet, "/categories/"+id.String(), nil)
		s.router.ServeHTTP(w, r)

		s.Equal(http.StatusNotFound, w.Code)
		s.mockSvc.AssertExpectations(s.T())
	})
}

func TestCategoryHandlerSuite(t *testing.T) {
	suite.Run(t, new(CategoryHandlerTestSuite))
}
