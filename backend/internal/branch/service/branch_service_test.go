package service

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/octguy/bakerio/backend/internal/branch/dto"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/suite"
)

// --- 1. MOCK REPOSITORY ---

type MockBranchRepo struct {
	mock.Mock
}

func (m *MockBranchRepo) CreateBranch(ctx context.Context, name, address string, lat, lng *float64, region string) (*domain.Branch, error) {
	args := m.Called(ctx, name, address, lat, lng, region)
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

func (m *MockBranchRepo) UpdateBranch(ctx context.Context, id uuid.UUID, name, address string, lat, lng *float64, region string) (*domain.Branch, error) {
	args := m.Called(ctx, id, name, address, lat, lng, region)
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

type MockTxManager struct {
	mock.Mock
}

func (m *MockTxManager) WithTx(ctx context.Context, fn func(ctx context.Context) error) error {
	m.Called(ctx, mock.Anything)
	return fn(ctx)
}

// --- 2. TEST SUITE ---

type BranchServiceTestSuite struct {
	suite.Suite
	mockRepo *MockBranchRepo
	mockTx   *MockTxManager
	service  BranchService
}

func (s *BranchServiceTestSuite) SetupTest() {
	s.mockRepo = new(MockBranchRepo)
	s.mockTx = new(MockTxManager)
	s.service = NewBranchService(s.mockTx, s.mockRepo)
}

// --- 3. TEST METHODS ---

func (s *BranchServiceTestSuite) TestCreateBranch() {
	req := dto.CreateBranchRequest{Name: "B1", Address: "A1", Region: "north"}
	branch := &domain.Branch{ID: uuid.New(), Name: "B1", Region: "north"}

	s.Run("Success", func() {
		s.mockRepo.On("CreateBranch", mock.Anything, req.Name, req.Address, req.Lat, req.Lng, req.Region).Return(branch, nil).Once()
		res, err := s.service.CreateBranch(context.Background(), req)
		s.NoError(err)
		s.Equal(branch.ID, res.ID)
		s.mockRepo.AssertExpectations(s.T())
	})

	s.Run("DB Error", func() {
		s.mockRepo.On("CreateBranch", mock.Anything, req.Name, req.Address, req.Lat, req.Lng, req.Region).Return(nil, apperrors.Internal("db error", nil)).Once()
		_, err := s.service.CreateBranch(context.Background(), req)
		s.Error(err)
		s.mockRepo.AssertExpectations(s.T())
	})
}

func (s *BranchServiceTestSuite) TestGetBranchByID() {
	id := uuid.New()
	branch := &domain.Branch{ID: id, Name: "B1"}

	s.Run("Success", func() {
		s.mockRepo.On("GetBranchByID", mock.Anything, id).Return(branch, nil).Once()
		res, err := s.service.GetBranchByID(context.Background(), id)
		s.NoError(err)
		s.Equal(id, res.ID)
		s.mockRepo.AssertExpectations(s.T())
	})

	s.Run("Not Found", func() {
		s.mockRepo.On("GetBranchByID", mock.Anything, id).Return(nil, nil).Once()
		_, err := s.service.GetBranchByID(context.Background(), id)
		s.Error(err)
		s.Equal(apperrors.CodeNotFound, err.(*apperrors.AppError).Code)
		s.mockRepo.AssertExpectations(s.T())
	})

	s.Run("DB Error", func() {
		s.mockRepo.On("GetBranchByID", mock.Anything, id).Return(nil, apperrors.Internal("db error", nil)).Once()
		_, err := s.service.GetBranchByID(context.Background(), id)
		s.Error(err)
		s.mockRepo.AssertExpectations(s.T())
	})
}

func (s *BranchServiceTestSuite) TestGetAllBranches() {
	branches := []*domain.Branch{{ID: uuid.New(), Name: "B1"}}

	s.Run("Success", func() {
		s.mockRepo.On("GetAllBranches", mock.Anything).Return(branches, nil).Once()
		res, err := s.service.GetAllBranches(context.Background())
		s.NoError(err)
		s.Len(res, 1)
		s.mockRepo.AssertExpectations(s.T())
	})

	s.Run("DB Error", func() {
		s.mockRepo.On("GetAllBranches", mock.Anything).Return(nil, apperrors.Internal("db error", nil)).Once()
		_, err := s.service.GetAllBranches(context.Background())
		s.Error(err)
		s.mockRepo.AssertExpectations(s.T())
	})
}

func (s *BranchServiceTestSuite) TestUpdateBranch() {
	id := uuid.New()
	current := &domain.Branch{ID: id, Name: "B1", Address: "A1", Region: "north"}
	newName := "B1 Updated"
	req := dto.UpdateBranchRequest{Name: &newName}
	updated := &domain.Branch{ID: id, Name: newName, Address: "A1", Region: "north"}

	s.Run("Success Partial Update", func() {
		s.mockRepo.On("GetBranchByID", mock.Anything, id).Return(current, nil).Once()
		s.mockRepo.On("UpdateBranch", mock.Anything, id, newName, "A1", (*float64)(nil), (*float64)(nil), "north").Return(updated, nil).Once()
		res, err := s.service.UpdateBranch(context.Background(), id, req)
		s.NoError(err)
		s.Equal(newName, res.Name)
		s.Equal("A1", res.Address)
		s.mockRepo.AssertExpectations(s.T())
	})

	s.Run("Not Found", func() {
		s.mockRepo.On("GetBranchByID", mock.Anything, id).Return(nil, nil).Once()
		_, err := s.service.UpdateBranch(context.Background(), id, req)
		s.Error(err)
		s.Equal(apperrors.CodeNotFound, err.(*apperrors.AppError).Code)
		s.mockRepo.AssertExpectations(s.T())
	})
}

func (s *BranchServiceTestSuite) TestUpdateBranchStatus() {
	id := uuid.New()

	s.Run("Success", func() {
		s.mockRepo.On("UpdateBranchStatus", mock.Anything, id, "inactive").Return(nil).Once()
		err := s.service.UpdateBranchStatus(context.Background(), id, "inactive")
		s.NoError(err)
		s.mockRepo.AssertExpectations(s.T())
	})

	s.Run("DB Error", func() {
		s.mockRepo.On("UpdateBranchStatus", mock.Anything, id, "inactive").Return(apperrors.Internal("db error", nil)).Once()
		err := s.service.UpdateBranchStatus(context.Background(), id, "inactive")
		s.Error(err)
		s.mockRepo.AssertExpectations(s.T())
	})
}

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
