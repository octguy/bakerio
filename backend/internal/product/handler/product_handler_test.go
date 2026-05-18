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
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/suite"
)

// --- 1. MOCK SERVICE ---

type MockProductService struct {
	mock.Mock
}

func (m *MockProductService) CreateProduct(ctx context.Context, req dto.CreateProductRequest) (dto.ProductResponse, error) {
	args := m.Called(ctx, req)
	return args.Get(0).(dto.ProductResponse), args.Error(1)
}

func (m *MockProductService) GetProduct(ctx context.Context, id uuid.UUID) (dto.ProductResponse, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(dto.ProductResponse), args.Error(1)
}

func (m *MockProductService) ListProducts(ctx context.Context) ([]dto.ProductResponse, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]dto.ProductResponse), args.Error(1)
}

func (m *MockProductService) UpdateProduct(ctx context.Context, id uuid.UUID, req dto.UpdateProductRequest) (dto.ProductResponse, error) {
	args := m.Called(ctx, id, req)
	return args.Get(0).(dto.ProductResponse), args.Error(1)
}

func (m *MockProductService) DeleteProduct(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockProductService) SetPrice(ctx context.Context, productID uuid.UUID, req dto.SetPriceRequest) (dto.ProductPriceResponse, error) {
	args := m.Called(ctx, productID, req)
	return args.Get(0).(dto.ProductPriceResponse), args.Error(1)
}

func (m *MockProductService) GetPriceHistory(ctx context.Context, id uuid.UUID) ([]dto.ProductPriceHistoryResponse, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]dto.ProductPriceHistoryResponse), args.Error(1)
}

// --- 2. TEST SUITE ---

type ProductHandlerTestSuite struct {
	suite.Suite
	mockSvc *MockProductService
	handler *ProductHandler
	router  *gin.Engine
}

func (s *ProductHandlerTestSuite) SetupTest() {
	gin.SetMode(gin.TestMode)
	s.mockSvc = new(MockProductService)
	s.handler = NewProductHandler(s.mockSvc)
	s.router = gin.New()

	group := s.router.Group("/products")
	group.POST("", s.handler.CreateProduct)
	group.GET("/:id", s.handler.GetProduct)
	group.GET("", s.handler.ListProducts)
	group.PATCH("/:id", s.handler.UpdateProduct)
	group.DELETE("/:id", s.handler.DeleteProduct)
	group.POST("/:id/prices", s.handler.SetPrice)
	group.GET("/:id/prices", s.handler.GetPriceHistory)
}

// --- 3. TEST METHODS ---

func (s *ProductHandlerTestSuite) TestCreateProduct() {
	price := decimal.NewFromFloat(10.5)
	req := dto.CreateProductRequest{
		SKU:   "SKU-1",
		Name:  "Prod 1",
		Unit:  "piece",
		Price: &price,
	}
	resp := dto.ProductResponse{ID: uuid.New(), SKU: "SKU-1", Name: "Prod 1"}

	s.Run("Success", func() {
		s.mockSvc.On("CreateProduct", mock.Anything, req).Return(resp, nil).Once()

		body, _ := json.Marshal(req)
		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodPost, "/products", bytes.NewBuffer(body))
		s.router.ServeHTTP(w, r)

		s.Equal(http.StatusCreated, w.Code)
		s.mockSvc.AssertExpectations(s.T())
	})

	s.Run("Validation Error", func() {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodPost, "/products", bytes.NewBufferString("{invalid}"))
		s.router.ServeHTTP(w, r)
		s.Equal(http.StatusUnprocessableEntity, w.Code)
	})
}

func (s *ProductHandlerTestSuite) TestGetProduct() {
	id := uuid.New()
	resp := dto.ProductResponse{ID: id, Name: "Prod 1"}

	s.Run("Success", func() {
		s.mockSvc.On("GetProduct", mock.Anything, id).Return(resp, nil).Once()

		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodGet, "/products/"+id.String(), nil)
		s.router.ServeHTTP(w, r)

		s.Equal(http.StatusOK, w.Code)
		s.mockSvc.AssertExpectations(s.T())
	})

	s.Run("Invalid ID", func() {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodGet, "/products/invalid", nil)
		s.router.ServeHTTP(w, r)

		s.Equal(http.StatusUnprocessableEntity, w.Code)
	})
}

func (s *ProductHandlerTestSuite) TestListProducts() {
	resp := []dto.ProductResponse{{ID: uuid.New(), Name: "Prod 1"}}

	s.Run("Success", func() {
		s.mockSvc.On("ListProducts", mock.Anything).Return(resp, nil).Once()

		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodGet, "/products", nil)
		s.router.ServeHTTP(w, r)

		s.Equal(http.StatusOK, w.Code)
		s.mockSvc.AssertExpectations(s.T())
	})
}

func (s *ProductHandlerTestSuite) TestGetPriceHistory() {
	id := uuid.New()
	price := decimal.NewFromFloat(10.5)
	resp := []dto.ProductPriceHistoryResponse{
		{Price: price},
	}

	s.Run("Success", func() {
		s.mockSvc.On("GetPriceHistory", mock.Anything, id).Return(resp, nil).Once()

		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodGet, "/products/"+id.String()+"/prices", nil)
		s.router.ServeHTTP(w, r)

		s.Equal(http.StatusOK, w.Code)
		s.mockSvc.AssertExpectations(s.T())
	})

	s.Run("Invalid ID", func() {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodGet, "/products/invalid/prices", nil)
		s.router.ServeHTTP(w, r)

		s.Equal(http.StatusUnprocessableEntity, w.Code)
	})
}


func (s *ProductHandlerTestSuite) TestUpdateProduct() {
	id := uuid.New()
	name := "Updated Product"
	req := dto.UpdateProductRequest{Name: &name}
	resp := dto.ProductResponse{ID: id, Name: name}

	s.Run("Success", func() {
		s.mockSvc.On("UpdateProduct", mock.Anything, id, req).Return(resp, nil).Once()

		body, _ := json.Marshal(req)
		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodPatch, "/products/"+id.String(), bytes.NewBuffer(body))
		s.router.ServeHTTP(w, r)

		s.Equal(http.StatusOK, w.Code)
	})

	s.Run("Invalid ID", func() {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodPatch, "/products/invalid", bytes.NewBufferString("{}"))
		s.router.ServeHTTP(w, r)
		s.Equal(http.StatusUnprocessableEntity, w.Code)
	})
}

func (s *ProductHandlerTestSuite) TestDeleteProduct() {
	id := uuid.New()

	s.Run("Success", func() {
		s.mockSvc.On("DeleteProduct", mock.Anything, id).Return(nil).Once()

		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodDelete, "/products/"+id.String(), nil)
		s.router.ServeHTTP(w, r)

		s.Equal(http.StatusNoContent, w.Code)
	})

	s.Run("Invalid ID", func() {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodDelete, "/products/invalid", nil)
		s.router.ServeHTTP(w, r)
		s.Equal(http.StatusUnprocessableEntity, w.Code)
	})
}

func (s *ProductHandlerTestSuite) TestSetPrice() {
	id := uuid.New()
	price := decimal.NewFromInt(20)
	req := dto.SetPriceRequest{BranchID: uuid.New(), Price: price}
	resp := dto.ProductPriceResponse{BranchID: req.BranchID, Price: price}

	s.Run("Success", func() {
		s.mockSvc.On("SetPrice", mock.Anything, id, req).Return(resp, nil).Once()

		body, _ := json.Marshal(req)
		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodPost, "/products/"+id.String()+"/prices", bytes.NewBuffer(body))
		s.router.ServeHTTP(w, r)

		s.Equal(http.StatusOK, w.Code)
	})

	s.Run("Invalid ID", func() {
		body, _ := json.Marshal(req)
		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodPost, "/products/invalid/prices", bytes.NewBuffer(body))
		s.router.ServeHTTP(w, r)
		s.Equal(http.StatusUnprocessableEntity, w.Code)
	})
}

func (s *ProductHandlerTestSuite) TestRegisterRoutes() {
	router := gin.New()
	s.handler.RegisterRoutes(router.Group("/api"))
	s.NotNil(router)
}

func TestProductHandlerSuite(t *testing.T) {
	suite.Run(t, new(ProductHandlerTestSuite))
}
