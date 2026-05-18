package service

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/suite"
)

// --- 1. MOCK REPOSITORY ---

type MockBranchRepo struct {
	mock.Mock
}

func (m *MockBranchRepo) CreateBranch(ctx context.Context, name, address string, lat, lng *float64) (*domain.Branch, error) {
	args := m.Called(ctx, name, address, lat, lng)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Branch), args.Error(1)
}

func (m *MockBranchRepo) GetBranchByID(ctx context.Context, id uuid.UUID) (*domain.Branch, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Branch), args.Error(1)
}

func (m *MockBranchRepo) GetAllBranches(ctx context.Context) ([]*domain.Branch, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.Branch), args.Error(1)
}

func (m *MockBranchRepo) UpdateBranch(ctx context.Context, id uuid.UUID, name, address string, lat, lng *float64) (*domain.Branch, error) {
	args := m.Called(ctx, id, name, address, lat, lng)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Branch), args.Error(1)
}

func (m *MockBranchRepo) UpdateBranchStatus(ctx context.Context, id uuid.UUID, status string) error {
	args := m.Called(ctx, id, status)
	return args.Error(0)
}

func (m *MockBranchRepo) SoftDeleteBranch(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

// --- 2. TEST SUITE ---

type BranchServiceTestSuite struct {
	suite.Suite
	mockRepo *MockBranchRepo
	service  BranchService
}

func (s *BranchServiceTestSuite) SetupTest() {
	s.mockRepo = new(MockBranchRepo)
	s.service = NewBranchService(nil, s.mockRepo)
}

// --- 3. TEST METHODS ---

func (s *BranchServiceTestSuite) TestDeleteBranch() {
	branchID := uuid.New()

	s.Run("Success", func() {
		s.mockRepo.On("SoftDeleteBranch", mock.Anything, branchID).Return(nil).Once()
		err := s.service.DeleteBranch(context.Background(), branchID)
		s.NoError(err)
		s.mockRepo.AssertExpectations(s.T())
	})
}

func TestBranchServiceSuite(t *testing.T) {
	suite.Run(t, new(BranchServiceTestSuite))
}
