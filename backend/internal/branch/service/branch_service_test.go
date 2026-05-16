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

func (s *BranchServiceTestSuite) TestGetAllBranches() {
	branch1ID := uuid.New()
	branch2ID := uuid.New()

	tests := []struct {
		name          string
		mockRepoResp  []*domain.Branch
		mockRepoErr   error
		expectedError apperrors.Code
		expectedCount int
	}{
		{
			name:          "Success (Empty)",
			mockRepoResp:  []*domain.Branch{},
			mockRepoErr:   nil,
			expectedCount: 0,
		}, {
			name: "Success (With Data)",
			mockRepoResp: []*domain.Branch{
				{ID: branch1ID, Name: "Branch 1"},
				{ID: branch2ID, Name: "Branch 2"},
			},
			mockRepoErr:   nil,
			expectedCount: 2,
		}, {
			name:          "Database Error",
			mockRepoResp:  nil,
			mockRepoErr:   apperrors.Internal("db failure", nil),
			expectedError: apperrors.CodeInternal,
		},
	}

	for _, tt := range tests {
		s.Run(tt.name, func() {
			s.mockRepo.On("GetAllBranches", mock.Anything).Return(tt.mockRepoResp, tt.mockRepoErr).Once()

			res, err := s.service.GetAllBranches(context.Background())

			if tt.expectedError != "" {
				s.Error(err)
				appErr, ok := err.(*apperrors.AppError)
				s.True(ok)
				s.Equal(tt.expectedError, appErr.Code)
			} else {
				s.NoError(err)
				s.Len(res, tt.expectedCount)
				if tt.expectedCount > 0 {
					s.Equal(tt.mockRepoResp[0].Name, res[0].Name)
				}
			}
			s.mockRepo.AssertExpectations(s.T())
		})
	}
}

func (s *BranchServiceTestSuite) TestGetBranchByID() {
	branchID := uuid.New()

	tests := []struct {
		name          string
		id            uuid.UUID
		mockRepoResp  *domain.Branch
		mockRepoErr   error
		expectedError apperrors.Code
	}{
		{
			name:          "Success",
			id:            branchID,
			mockRepoResp:  &domain.Branch{ID: branchID, Name: "Central Bakery"},
			mockRepoErr:   nil,
			expectedError: "",
		},
		{
			name:          "Not Found",
			id:            branchID,
			mockRepoResp:  nil,
			mockRepoErr:   nil,
			expectedError: apperrors.CodeNotFound,
		},
		{
			name:          "Database Error",
			id:            branchID,
			mockRepoResp:  nil,
			mockRepoErr:   apperrors.Internal("db failure", nil),
			expectedError: apperrors.CodeInternal,
		},
	}

	for _, tt := range tests {
		s.Run(tt.name, func() {
			s.mockRepo.On("GetBranchByID", mock.Anything, tt.id).Return(tt.mockRepoResp, tt.mockRepoErr).Once()

			res, err := s.service.GetBranchByID(context.Background(), tt.id)

			if tt.expectedError != "" {
				s.Error(err)
				appErr, ok := err.(*apperrors.AppError)
				s.True(ok)
				s.Equal(tt.expectedError, appErr.Code)
			} else {
				s.NoError(err)
				s.Equal(tt.mockRepoResp.Name, res.Name)
			}
			s.mockRepo.AssertExpectations(s.T())
		})
	}
}

func (s *BranchServiceTestSuite) TestCreateBranch() {
	branchID := uuid.New()

	request := dto.CreateBranchRequest{Name: "Test Branch", Address: "Test Address", Lat: floatPtr(36.0), Lng: floatPtr(36.0)}

	tests := []struct {
		name          string
		req           *dto.CreateBranchRequest
		mockRepoResp  *domain.Branch
		mockRepoErr   error
		expectedError apperrors.Code
	}{
		{
			name:          "Success",
			req:           &request,
			mockRepoResp:  &domain.Branch{ID: branchID, Name: "Test Branch", Address: "Test Address", Lat: floatPtr(36.0), Lng: floatPtr(36.0)},
			mockRepoErr:   nil,
			expectedError: "",
		},
		{
			name:          "Database Error",
			req:           &request,
			mockRepoResp:  nil,
			mockRepoErr:   apperrors.Internal("db failure", nil),
			expectedError: apperrors.CodeInternal,
		},
	}

	for _, tt := range tests {
		s.Run(tt.name, func() {
			s.mockRepo.On("CreateBranch",
				mock.Anything,
				tt.req.Name,
				tt.req.Address,
				tt.req.Lat,
				tt.req.Lng,
			).Return(tt.mockRepoResp, tt.mockRepoErr).Once()

			res, err := s.service.CreateBranch(context.Background(), *tt.req)

			if tt.expectedError != "" {
				s.Error(err)
				appErr, ok := err.(*apperrors.AppError)
				s.True(ok)
				s.Equal(tt.expectedError, appErr.Code)
			} else {
				s.NoError(err)
				s.Equal(tt.mockRepoResp.Name, res.Name)
			}
			s.mockRepo.AssertExpectations(s.T())
		})
	}
}

func (s *BranchServiceTestSuite) TestUpdateBranch() {
	branchID := uuid.New()
	name := "Updated Name"
	address := "Updated Address"

	currentBranch := &domain.Branch{
		ID:      branchID,
		Name:    "Old Name",
		Address: "Old Address",
		Lat:     floatPtr(10.0),
		Lng:     floatPtr(10.0),
	}

	tests := []struct {
		name           string
		req            dto.UpdateBranchRequest
		mockGetResp    *domain.Branch
		mockGetErr     error
		mockUpdateResp *domain.Branch
		mockUpdateErr  error
		expectedError  apperrors.Code
	}{
		{
			name: "Success (Partial Update)",
			req: dto.UpdateBranchRequest{
				Name: &name,
			},
			mockGetResp: currentBranch,
			mockUpdateResp: &domain.Branch{
				ID:      branchID,
				Name:    name,
				Address: currentBranch.Address,
				Lat:     currentBranch.Lat,
				Lng:     currentBranch.Lng,
			},
			expectedError: "",
		},
		{
			name: "Success (Full Update)",
			req: dto.UpdateBranchRequest{
				Name:    &name,
				Address: &address,
				Lat:     floatPtr(20.0),
				Lng:     floatPtr(20.0),
			},
			mockGetResp: currentBranch,
			mockUpdateResp: &domain.Branch{
				ID:      branchID,
				Name:    name,
				Address: address,
				Lat:     floatPtr(20.0),
				Lng:     floatPtr(20.0),
			},
			expectedError: "",
		},
		{
			name:          "Not Found",
			req:           dto.UpdateBranchRequest{Name: &name},
			mockGetResp:   nil,
			mockGetErr:    nil,
			expectedError: apperrors.CodeNotFound,
		},
	}

	for _, tt := range tests {
		s.Run(tt.name, func() {
			s.mockRepo.On("GetBranchByID", mock.Anything, branchID).Return(tt.mockGetResp, tt.mockGetErr).Once()

			if tt.mockGetResp != nil && tt.mockGetErr == nil {
				// Calculate expected update params based on merge logic
				expName := tt.mockGetResp.Name
				if tt.req.Name != nil {
					expName = *tt.req.Name
				}
				expAddr := tt.mockGetResp.Address
				if tt.req.Address != nil {
					expAddr = *tt.req.Address
				}
				expLat := tt.mockGetResp.Lat
				if tt.req.Lat != nil {
					expLat = tt.req.Lat
				}
				expLng := tt.mockGetResp.Lng
				if tt.req.Lng != nil {
					expLng = tt.req.Lng
				}

				s.mockRepo.On("UpdateBranch", mock.Anything, branchID, expName, expAddr, expLat, expLng).
					Return(tt.mockUpdateResp, tt.mockUpdateErr).Once()
			}

			res, err := s.service.UpdateBranch(context.Background(), branchID, tt.req)

			if tt.expectedError != "" {
				s.Error(err)
				appErr, ok := err.(*apperrors.AppError)
				s.True(ok)
				s.Equal(tt.expectedError, appErr.Code)
			} else {
				s.NoError(err)
				s.Equal(tt.mockUpdateResp.Name, res.Name)
			}
			s.mockRepo.AssertExpectations(s.T())
		})
	}
}

func (s *BranchServiceTestSuite) TestUpdateBranchStatus() {
	branchID := uuid.New()
	status := "active"

	tests := []struct {
		name          string
		mockRepoErr   error
		expectedError apperrors.Code
	}{
		{
			name:          "Success",
			mockRepoErr:   nil,
			expectedError: "",
		},
		{
			name:          "Database Error",
			mockRepoErr:   apperrors.Internal("db failure", nil),
			expectedError: apperrors.CodeInternal,
		},
	}

	for _, tt := range tests {
		s.Run(tt.name, func() {
			s.mockRepo.On("UpdateBranchStatus", mock.Anything, branchID, status).Return(tt.mockRepoErr).Once()

			err := s.service.UpdateBranchStatus(context.Background(), branchID, status)

			if tt.expectedError != "" {
				s.Error(err)
				appErr, ok := err.(*apperrors.AppError)
				s.True(ok)
				s.Equal(tt.expectedError, appErr.Code)
			} else {
				s.NoError(err)
			}
			s.mockRepo.AssertExpectations(s.T())
		})
	}
}

func floatPtr(f float64) *float64 {
	return &f
}

func TestBranchServiceSuite(t *testing.T) {
	suite.Run(t, new(BranchServiceTestSuite))
}
