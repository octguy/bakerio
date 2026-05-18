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
	"github.com/octguy/bakerio/backend/internal/procurement/dto"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/suite"
)

type MockSupplierService struct {
	mock.Mock
}

func (m *MockSupplierService) Create(ctx context.Context, req dto.CreateSupplierRequest) (dto.SupplierResponse, error) {
	args := m.Called(ctx, req)
	return args.Get(0).(dto.SupplierResponse), args.Error(1)
}

func (m *MockSupplierService) Get(ctx context.Context, id uuid.UUID) (dto.SupplierResponse, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(dto.SupplierResponse), args.Error(1)
}

func (m *MockSupplierService) List(ctx context.Context, region string) ([]dto.SupplierResponse, error) {
	args := m.Called(ctx, region)
	return args.Get(0).([]dto.SupplierResponse), args.Error(1)
}

func (m *MockSupplierService) Update(ctx context.Context, id uuid.UUID, req dto.UpdateSupplierRequest) (dto.SupplierResponse, error) {
	args := m.Called(ctx, id, req)
	return args.Get(0).(dto.SupplierResponse), args.Error(1)
}

func (m *MockSupplierService) Delete(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

type SupplierHandlerTestSuite struct {
	suite.Suite
	mockSvc *MockSupplierService
	handler *SupplierHandler
	router  *gin.Engine
}

func (s *SupplierHandlerTestSuite) SetupTest() {
	gin.SetMode(gin.TestMode)
	s.mockSvc = new(MockSupplierService)
	s.handler = NewSupplierHandler(s.mockSvc)
	s.router = gin.New()

	group := s.router.Group("/procurement/suppliers")
	group.POST("", s.handler.Create)
	group.GET("", s.handler.List)
	group.GET("/:id", s.handler.Get)
	group.PATCH("/:id", s.handler.Update)
	group.DELETE("/:id", s.handler.Delete)
}

func (s *SupplierHandlerTestSuite) TestCreateSupplier() {
	req := dto.CreateSupplierRequest{Name: "Sup 1", Region: "north"}
	resp := dto.SupplierResponse{ID: uuid.New(), Name: req.Name}

	s.Run("Success", func() {
		s.mockSvc.On("Create", mock.Anything, req).Return(resp, nil).Once()

		body, _ := json.Marshal(req)
		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodPost, "/procurement/suppliers", bytes.NewBuffer(body))
		s.router.ServeHTTP(w, r)

		s.Equal(http.StatusCreated, w.Code)
		s.mockSvc.AssertExpectations(s.T())
	})

	s.Run("Validation Error", func() {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodPost, "/procurement/suppliers", bytes.NewBufferString("{invalid}"))
		s.router.ServeHTTP(w, r)
		s.Equal(http.StatusUnprocessableEntity, w.Code)
	})
}

func (s *SupplierHandlerTestSuite) TestGetSupplier() {
	id := uuid.New()
	resp := dto.SupplierResponse{ID: id, Name: "Sup 1"}

	s.Run("Success", func() {
		s.mockSvc.On("Get", mock.Anything, id).Return(resp, nil).Once()

		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodGet, "/procurement/suppliers/"+id.String(), nil)
		s.router.ServeHTTP(w, r)

		s.Equal(http.StatusOK, w.Code)
		s.mockSvc.AssertExpectations(s.T())
	})

	s.Run("Not Found", func() {
		s.mockSvc.On("Get", mock.Anything, id).Return(dto.SupplierResponse{}, apperrors.NotFound("not found")).Once()

		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodGet, "/procurement/suppliers/"+id.String(), nil)
		s.router.ServeHTTP(w, r)

		s.Equal(http.StatusNotFound, w.Code)
		s.mockSvc.AssertExpectations(s.T())
	})

	s.Run("Invalid ID", func() {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodGet, "/procurement/suppliers/invalid-id", nil)
		s.router.ServeHTTP(w, r)

		s.Equal(http.StatusUnprocessableEntity, w.Code)
	})
}

func (s *SupplierHandlerTestSuite) TestListSuppliers() {
	resp := []dto.SupplierResponse{{ID: uuid.New()}}

	s.Run("Success", func() {
		s.mockSvc.On("List", mock.Anything, "north").Return(resp, nil).Once()

		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodGet, "/procurement/suppliers?region=north", nil)
		s.router.ServeHTTP(w, r)

		s.Equal(http.StatusOK, w.Code)
		s.mockSvc.AssertExpectations(s.T())
	})
}

func (s *SupplierHandlerTestSuite) TestUpdateSupplier() {
	id := uuid.New()
	name := "Updated"
	req := dto.UpdateSupplierRequest{Name: &name}
	resp := dto.SupplierResponse{ID: id, Name: name}

	s.Run("Success", func() {
		s.mockSvc.On("Update", mock.Anything, id, req).Return(resp, nil).Once()

		body, _ := json.Marshal(req)
		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodPatch, "/procurement/suppliers/"+id.String(), bytes.NewBuffer(body))
		s.router.ServeHTTP(w, r)

		s.Equal(http.StatusOK, w.Code)
		s.mockSvc.AssertExpectations(s.T())
	})

	s.Run("Validation Error", func() {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodPatch, "/procurement/suppliers/"+id.String(), bytes.NewBufferString("invalid"))
		s.router.ServeHTTP(w, r)

		s.Equal(http.StatusUnprocessableEntity, w.Code)
	})
}

func (s *SupplierHandlerTestSuite) TestDeleteSupplier() {
	id := uuid.New()

	s.Run("Success", func() {
		s.mockSvc.On("Delete", mock.Anything, id).Return(nil).Once()

		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodDelete, "/procurement/suppliers/"+id.String(), nil)
		s.router.ServeHTTP(w, r)

		s.Equal(http.StatusNoContent, w.Code)
		s.mockSvc.AssertExpectations(s.T())
	})

	s.Run("Invalid ID", func() {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodDelete, "/procurement/suppliers/invalid", nil)
		s.router.ServeHTTP(w, r)

		s.Equal(http.StatusUnprocessableEntity, w.Code)
	})
}

func TestSupplierHandlerSuite(t *testing.T) {
	suite.Run(t, new(SupplierHandlerTestSuite))
}
