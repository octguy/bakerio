package service

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/octguy/bakerio/backend/internal/product/dto"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/suite"
)

// --- 1. MOCK REPOSITORIES ---

type MockProductRepo struct {
	mock.Mock
}

func (m *MockProductRepo) Create(ctx context.Context, p *domain.Product) (*domain.Product, error) {
	args := m.Called(ctx, p)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Product), args.Error(1)
}

func (m *MockProductRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Product, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Product), args.Error(1)
}

func (m *MockProductRepo) GetBySlug(ctx context.Context, slug string) (*domain.Product, error) {
	args := m.Called(ctx, slug)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Product), args.Error(1)
}

func (m *MockProductRepo) List(ctx context.Context) ([]*domain.Product, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.Product), args.Error(1)
}

func (m *MockProductRepo) Update(ctx context.Context, p *domain.Product) (*domain.Product, error) {
	args := m.Called(ctx, p)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Product), args.Error(1)
}

func (m *MockProductRepo) Delete(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockProductRepo) SetPrice(ctx context.Context, productID, branchID uuid.UUID, price decimal.Decimal) (*domain.ProductPrice, error) {
	args := m.Called(ctx, productID, branchID, price)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.ProductPrice), args.Error(1)
}

func (m *MockProductRepo) GetPrice(ctx context.Context, productID, branchID uuid.UUID) (*domain.ProductPrice, error) {
	args := m.Called(ctx, productID, branchID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.ProductPrice), args.Error(1)
}

func (m *MockProductRepo) ListPriceHistory(ctx context.Context, id uuid.UUID) ([]*domain.ProductPriceHistory, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.ProductPriceHistory), args.Error(1)
}

func (m *MockProductRepo) InsertPriceHistory(ctx context.Context, productID uuid.UUID, branchID *uuid.UUID, price decimal.Decimal) error {
	args := m.Called(ctx, productID, branchID, price)
	return args.Error(0)
}

func (m *MockProductRepo) GetEffectivePrice(ctx context.Context, productID, branchID uuid.UUID) (decimal.Decimal, error) {
	args := m.Called(ctx, productID, branchID)
	return args.Get(0).(decimal.Decimal), args.Error(1)
}

// --- 2. NO-OP TX MANAGER ---

type MockProductTxManager struct {
	mock.Mock
}

func (m *MockProductTxManager) WithTx(ctx context.Context, fn func(ctx context.Context) error) error {
	m.Called(ctx, mock.Anything)
	return fn(ctx)
}

// --- 3. TEST SUITE ---

type ProductServiceTestSuite struct {
	suite.Suite
	mockRepo      *MockProductRepo
	mockImageRepo *MockImageRepo
	mockTx        *MockProductTxManager
	service       ProductService
}

func (s *ProductServiceTestSuite) SetupTest() {
	s.mockRepo = new(MockProductRepo)
	s.mockImageRepo = new(MockImageRepo)
	s.mockTx = new(MockProductTxManager)
	s.service = NewProductService(s.mockTx, s.mockRepo, s.mockImageRepo)
}

// --- 4. TEST METHODS ---

func (s *ProductServiceTestSuite) TestCreateProduct() {
	ctx := context.Background()
	price := decimal.NewFromFloat(10.5)
	req := dto.CreateProductRequest{
		SKU:   "PROD-001",
		Name:  "Test Product",
		Unit:  "piece",
		Price: &price,
	}

	p := &domain.Product{
		ID:        uuid.New(),
		SKU:       req.SKU,
		Name:      req.Name,
		BasePrice: price,
	}

	s.Run("Success", func() {
		s.mockTx.On("WithTx", ctx, mock.Anything).Return(nil).Once()
		s.mockRepo.On("Create", ctx, mock.MatchedBy(func(prod *domain.Product) bool {
			return prod.SKU == req.SKU && prod.Name == req.Name && prod.BasePrice.Equal(price)
		})).Return(p, nil).Once()
		s.mockRepo.On("InsertPriceHistory", ctx, p.ID, (*uuid.UUID)(nil), price).Return(nil).Once()

		res, err := s.service.CreateProduct(ctx, req)

		s.NoError(err)
		s.Equal(p.ID, res.ID)
		s.Equal(p.SKU, res.SKU)
		s.mockRepo.AssertExpectations(s.T())
		s.mockTx.AssertExpectations(s.T())
	})
}

func (s *ProductServiceTestSuite) TestGetProduct() {
	ctx := context.Background()
	id := uuid.New()

	p := &domain.Product{
		ID:   id,
		Name: "Test Product",
	}

	images := []*domain.ProductImage{
		{ID: uuid.New(), Url: "http://example.com/image.png"},
	}

	s.Run("Success with Images", func() {
		s.mockRepo.On("GetByID", ctx, id).Return(p, nil).Once()
		s.mockImageRepo.On("ListByProduct", ctx, id).Return(images, nil).Once()

		res, err := s.service.GetProduct(ctx, id)

		s.NoError(err)
		s.Equal(p.ID, res.ID)
		s.Len(res.Images, 1)
		s.Equal(images[0].Url, res.Images[0].Url)
		s.mockRepo.AssertExpectations(s.T())
		s.mockImageRepo.AssertExpectations(s.T())
	})

	s.Run("Not Found", func() {
		s.mockRepo.On("GetByID", ctx, id).Return(nil, nil).Once()

		_, err := s.service.GetProduct(ctx, id)

		s.Error(err)
		appErr := err.(*apperrors.AppError)
		s.Equal(apperrors.CodeNotFound, appErr.Code)
		s.mockRepo.AssertExpectations(s.T())
	})
}

func (s *ProductServiceTestSuite) TestSetPrice() {
	ctx := context.Background()
	productID := uuid.New()
	branchID := uuid.New()
	price := decimal.NewFromFloat(15.0)
	req := dto.SetPriceRequest{
		BranchID: branchID,
		Price:    price,
	}

	pp := &domain.ProductPrice{
		ProductID: productID,
		BranchID:  branchID,
		Price:     price,
		IsActive:  true,
	}

	s.Run("Success", func() {
		s.mockTx.On("WithTx", ctx, mock.Anything).Return(nil).Once()
		s.mockRepo.On("SetPrice", ctx, productID, branchID, price).Return(pp, nil).Once()
		s.mockRepo.On("InsertPriceHistory", ctx, productID, &branchID, price).Return(nil).Once()

		res, err := s.service.SetPrice(ctx, productID, req)

		s.NoError(err)
		s.Equal(price, res.Price)
		s.Equal(branchID, res.BranchID)
		s.mockRepo.AssertExpectations(s.T())
		s.mockTx.AssertExpectations(s.T())
	})

	s.Run("Nil Branch ID", func() {
		req.BranchID = uuid.Nil
		s.mockTx.On("WithTx", ctx, mock.Anything).Return(apperrors.Validation("branch_id required for price override. use UpdateProduct to change global price")).Once()
		_, err := s.service.SetPrice(ctx, productID, req)
		s.Error(err)
	})
}

func (s *ProductServiceTestSuite) TestListProducts() {
	products := []*domain.Product{{ID: uuid.New(), Name: "Product 1"}}

	s.Run("Success", func() {
		s.mockRepo.On("List", mock.Anything).Return(products, nil).Once()

		res, err := s.service.ListProducts(context.Background())
		s.NoError(err)
		s.Len(res, 1)
	})
}

func (s *ProductServiceTestSuite) TestUpdateProduct() {
	id := uuid.New()
	product := &domain.Product{ID: id, Name: "Product 1", BasePrice: decimal.NewFromInt(10)}
	newName := "Product Updated"
	newPrice := decimal.NewFromInt(20)
	req := dto.UpdateProductRequest{
		Name:      &newName,
		BasePrice: &newPrice,
	}

	s.Run("Success", func() {
		s.mockTx.On("WithTx", mock.Anything, mock.Anything).Return(nil).Once()
		s.mockRepo.On("GetByID", mock.Anything, id).Return(product, nil).Twice()
		s.mockRepo.On("InsertPriceHistory", mock.Anything, id, (*uuid.UUID)(nil), newPrice).Return(nil).Once()
		s.mockRepo.On("Update", mock.Anything, mock.Anything).Return(product, nil).Once()
		s.mockImageRepo.On("ListByProduct", mock.Anything, id).Return([]*domain.ProductImage{}, nil).Once()

		res, err := s.service.UpdateProduct(context.Background(), id, req)
		s.NoError(err)
		s.Equal(id, res.ID)
	})
}

func (s *ProductServiceTestSuite) TestDeleteProduct() {
	id := uuid.New()

	s.Run("Success", func() {
		s.mockRepo.On("Delete", mock.Anything, id).Return(nil).Once()

		err := s.service.DeleteProduct(context.Background(), id)
		s.NoError(err)
	})
}

func (s *ProductServiceTestSuite) TestGetPriceHistory() {
	id := uuid.New()
	history := []*domain.ProductPriceHistory{{ID: uuid.New(), ProductID: id, Price: decimal.NewFromInt(10)}}

	s.Run("Success", func() {
		s.mockRepo.On("ListPriceHistory", mock.Anything, id).Return(history, nil).Once()

		res, err := s.service.GetPriceHistory(context.Background(), id)
		s.NoError(err)
		s.Len(res, 1)
	})
}

func TestProductServiceSuite(t *testing.T) {
	suite.Run(t, new(ProductServiceTestSuite))
}
