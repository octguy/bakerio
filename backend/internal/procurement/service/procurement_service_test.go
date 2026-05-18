package service

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/octguy/bakerio/backend/internal/platform/outbox"
	"github.com/octguy/bakerio/backend/internal/procurement/dto"
	"github.com/octguy/bakerio/backend/internal/shared/authcontext"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/suite"
)

// --- 1. MOCKS ---

type MockProcurementRepo struct {
	mock.Mock
}

func (m *MockProcurementRepo) CreatePO(ctx context.Context, po *domain.PurchaseOrder) (*domain.PurchaseOrder, error) {
	args := m.Called(ctx, po)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.PurchaseOrder), args.Error(1)
}

func (m *MockProcurementRepo) GetPO(ctx context.Context, id uuid.UUID) (*domain.PurchaseOrder, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.PurchaseOrder), args.Error(1)
}

func (m *MockProcurementRepo) ListPOsByBranch(ctx context.Context, branchID uuid.UUID) ([]*domain.PurchaseOrder, error) {
	args := m.Called(ctx, branchID)
	return args.Get(0).([]*domain.PurchaseOrder), args.Error(1)
}

func (m *MockProcurementRepo) UpdatePOStatus(ctx context.Context, id uuid.UUID, status string) (*domain.PurchaseOrder, error) {
	args := m.Called(ctx, id, status)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.PurchaseOrder), args.Error(1)
}

func (m *MockProcurementRepo) CreatePOItem(ctx context.Context, item *domain.POItem) (*domain.POItem, error) {
	args := m.Called(ctx, item)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.POItem), args.Error(1)
}

func (m *MockProcurementRepo) GetPOItems(ctx context.Context, poID uuid.UUID) ([]*domain.POItem, error) {
	args := m.Called(ctx, poID)
	return args.Get(0).([]*domain.POItem), args.Error(1)
}

type MockSupplierRepo struct {
	mock.Mock
}

func (m *MockSupplierRepo) Create(ctx context.Context, s *domain.Supplier) (*domain.Supplier, error) {
	args := m.Called(ctx, s)
	return args.Get(0).(*domain.Supplier), args.Error(1)
}

func (m *MockSupplierRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Supplier, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Supplier), args.Error(1)
}

func (m *MockSupplierRepo) ListByRegion(ctx context.Context, region string) ([]*domain.Supplier, error) {
	args := m.Called(ctx, region)
	return args.Get(0).([]*domain.Supplier), args.Error(1)
}

func (m *MockSupplierRepo) Update(ctx context.Context, s *domain.Supplier) (*domain.Supplier, error) {
	args := m.Called(ctx, s)
	return args.Get(0).(*domain.Supplier), args.Error(1)
}

func (m *MockSupplierRepo) Delete(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

type MockOutboxSource struct {
	mock.Mock
}

func (m *MockOutboxSource) Save(ctx context.Context, routingKey string, payload any) error {
	args := m.Called(ctx, routingKey, payload)
	return args.Error(0)
}

func (m *MockOutboxSource) FetchUnpublished(ctx context.Context, limit int) ([]outbox.Event, error) {
	return nil, nil // Not used here
}

func (m *MockOutboxSource) MarkPublished(ctx context.Context, id uuid.UUID) error {
	return nil // Not used here
}

// Transaction manager that just runs the func
type NoOpTxManager struct{}

func (n *NoOpTxManager) WithTx(ctx context.Context, f func(context.Context) error) error {
	return f(ctx)
}

// --- 2. TEST SUITE ---

type ProcurementServiceTestSuite struct {
	suite.Suite
	mockRepo      *MockProcurementRepo
	mockSupRepo   *MockSupplierRepo
	mockOutbox    *MockOutboxSource
	service       ProcurementService
}

func (s *ProcurementServiceTestSuite) SetupTest() {
	s.mockRepo = new(MockProcurementRepo)
	s.mockSupRepo = new(MockSupplierRepo)
	s.mockOutbox = new(MockOutboxSource)
	s.service = NewProcurementService(s.mockRepo, s.mockSupRepo, &NoOpTxManager{}, s.mockOutbox)
}

// --- 3. TEST METHODS ---

func (s *ProcurementServiceTestSuite) TestCreatePO() {
	branchID := uuid.New()
	ctx := authcontext.WithCaller(context.Background(), uuid.New(), &branchID)
	supplierID := uuid.New()
	productID := uuid.New()

	req := dto.CreatePORequest{
		SupplierID: supplierID,
		Note:       "Test PO",
		Items: []dto.CreatePOItemRequest{
			{
				ProductID: productID,
				Quantity:  decimal.NewFromInt(10),
				UnitPrice: decimal.NewFromInt(5),
			},
		},
	}

	s.Run("Success", func() {
		s.mockSupRepo.On("GetByID", ctx, supplierID).Return(&domain.Supplier{ID: supplierID}, nil).Once()
		
		po := &domain.PurchaseOrder{
			SupplierID:  supplierID,
			BranchID:    branchID,
			Status:      StatusDraft,
			TotalAmount: decimal.NewFromInt(50),
			Note:        &req.Note,
		}
		
		createdPO := *po
		createdPO.ID = uuid.New()
		
		s.mockRepo.On("CreatePO", ctx, mock.Anything).Return(&createdPO, nil).Once()
		
		item := &domain.POItem{
			POID:       createdPO.ID,
			ProductID:  productID,
			Quantity:   decimal.NewFromInt(10),
			UnitPrice:  decimal.NewFromInt(5),
			TotalPrice: decimal.NewFromInt(50),
		}
		
		s.mockRepo.On("CreatePOItem", ctx, mock.Anything).Return(item, nil).Once()

		res, err := s.service.CreatePO(ctx, req)

		s.NoError(err)
		s.Equal(createdPO.ID, res.ID)
		s.Equal(decimal.NewFromInt(50), res.TotalAmount)
		s.Len(res.Items, 1)
	})

	s.Run("No Branch", func() {
		emptyCtx := context.Background()
		_, err := s.service.CreatePO(emptyCtx, req)
		s.Error(err)
		s.Contains(err.Error(), "no branch assigned")
	})
}

func (s *ProcurementServiceTestSuite) TestUpdateStatus() {
	poID := uuid.New()
	ctx := context.Background()

	s.Run("Invalid Transition", func() {
		s.mockRepo.On("GetPO", ctx, poID).Return(&domain.PurchaseOrder{Status: StatusReceived}, nil).Once()
		
		_, err := s.service.UpdateStatus(ctx, poID, StatusPending)
		s.Error(err)
		s.Contains(err.Error(), "invalid transition")
	})

	s.Run("Success to Received", func() {
		po := &domain.PurchaseOrder{
			ID:         poID,
			Status:     StatusApproved,
			BranchID:   uuid.New(),
			SupplierID: uuid.New(),
		}
		s.mockRepo.On("GetPO", ctx, poID).Return(po, nil).Once()
		
		updatedPO := *po
		updatedPO.Status = StatusReceived
		s.mockRepo.On("UpdatePOStatus", ctx, poID, StatusReceived).Return(&updatedPO, nil).Once()
		
		items := []*domain.POItem{{ID: uuid.New(), POID: poID}}
		s.mockRepo.On("GetPOItems", ctx, poID).Return(items, nil).Once()
		
		s.mockOutbox.On("Save", ctx, "procurement.order_received", mock.Anything).Return(nil).Once()

		res, err := s.service.UpdateStatus(ctx, poID, StatusReceived)

		s.NoError(err)
		s.Equal(StatusReceived, res.Status)
		s.mockOutbox.AssertExpectations(s.T())
	})
}

func TestProcurementServiceSuite(t *testing.T) {
	suite.Run(t, new(ProcurementServiceTestSuite))
}
