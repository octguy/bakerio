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
	"github.com/octguy/bakerio/backend/internal/platform/middleware"
	"github.com/octguy/bakerio/backend/internal/procurement/dto"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/suite"
)

type MockProcurementService struct {
	mock.Mock
}

func (m *MockProcurementService) CreatePO(ctx context.Context, req dto.CreatePORequest) (dto.POResponse, error) {
	args := m.Called(ctx, req)
	return args.Get(0).(dto.POResponse), args.Error(1)
}

func (m *MockProcurementService) GetPO(ctx context.Context, id uuid.UUID) (dto.POResponse, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(dto.POResponse), args.Error(1)
}

func (m *MockProcurementService) ListPOs(ctx context.Context) ([]dto.POResponse, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]dto.POResponse), args.Error(1)
}

func (m *MockProcurementService) UpdateStatus(ctx context.Context, id uuid.UUID, newStatus string) (dto.POResponse, error) {
	args := m.Called(ctx, id, newStatus)
	return args.Get(0).(dto.POResponse), args.Error(1)
}

type ProcurementHandlerTestSuite struct {
	suite.Suite
	mockSvc *MockProcurementService
	handler *ProcurementHandler
	router  *gin.Engine
}

func (s *ProcurementHandlerTestSuite) SetupTest() {
	gin.SetMode(gin.TestMode)
	s.mockSvc = new(MockProcurementService)
	s.handler = NewProcurementHandler(s.mockSvc)
	s.router = gin.New()

	group := s.router.Group("/procurement/orders")
	group.POST("", s.handler.CreatePO)
	group.GET("", s.handler.ListPOs)
	group.GET("/:id", s.handler.GetPO)
	group.PATCH("/:id/status", func(c *gin.Context) {
		// Mock permission for test
		c.Set(middleware.PermissionsKey, []string{"procurement:approve:branch"})
		s.handler.UpdateStatus(c)
	})
}

func (s *ProcurementHandlerTestSuite) TestCreatePO() {
	supplierID := uuid.New()
	req := dto.CreatePORequest{
		SupplierID: supplierID,
		Note:       "Test PO",
		Items: []dto.CreatePOItemRequest{
			{
				ProductID: uuid.New(),
				Quantity:  decimal.NewFromInt(10),
				UnitPrice: decimal.NewFromInt(5),
			},
		},
	}
	resp := dto.POResponse{ID: uuid.New(), Note: &req.Note}

	s.Run("Success", func() {
		s.mockSvc.On("CreatePO", mock.Anything, req).Return(resp, nil).Once()

		body, _ := json.Marshal(req)
		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodPost, "/procurement/orders", bytes.NewBuffer(body))
		s.router.ServeHTTP(w, r)

		s.Equal(http.StatusCreated, w.Code)
		s.mockSvc.AssertExpectations(s.T())
	})

	s.Run("Validation Error", func() {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodPost, "/procurement/orders", bytes.NewBufferString("{invalid}"))
		s.router.ServeHTTP(w, r)
		s.Equal(http.StatusUnprocessableEntity, w.Code)
	})
}

func (s *ProcurementHandlerTestSuite) TestGetPO() {
	id := uuid.New()
	resp := dto.POResponse{ID: id}

	s.Run("Success", func() {
		s.mockSvc.On("GetPO", mock.Anything, id).Return(resp, nil).Once()

		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodGet, "/procurement/orders/"+id.String(), nil)
		s.router.ServeHTTP(w, r)

		s.Equal(http.StatusOK, w.Code)
		s.mockSvc.AssertExpectations(s.T())
	})

	s.Run("Invalid ID", func() {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodGet, "/procurement/orders/invalid", nil)
		s.router.ServeHTTP(w, r)
		s.Equal(http.StatusUnprocessableEntity, w.Code)
	})
}

func (s *ProcurementHandlerTestSuite) TestListPOs() {
	resp := []dto.POResponse{{ID: uuid.New()}}

	s.Run("Success", func() {
		s.mockSvc.On("ListPOs", mock.Anything).Return(resp, nil).Once()

		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodGet, "/procurement/orders", nil)
		s.router.ServeHTTP(w, r)

		s.Equal(http.StatusOK, w.Code)
	})
}

func (s *ProcurementHandlerTestSuite) TestUpdateStatus() {
	id := uuid.New()
	req := dto.UpdatePOStatusRequest{Status: domain.POStatusApproved}
	resp := dto.POResponse{ID: id, Status: domain.POStatusApproved}

	s.Run("Success", func() {
		s.mockSvc.On("UpdateStatus", mock.Anything, id, req.Status).Return(resp, nil).Once()

		body, _ := json.Marshal(req)
		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodPatch, "/procurement/orders/"+id.String()+"/status", bytes.NewBuffer(body))
		s.router.ServeHTTP(w, r)

		s.Equal(http.StatusOK, w.Code)
	})
}

func TestProcurementHandlerSuite(t *testing.T) {
	suite.Run(t, new(ProcurementHandlerTestSuite))
}
