package service

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/octguy/bakerio/backend/internal/product/dto"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/suite"
)

// --- 1. MOCK REPOSITORY ---

type MockCategoryRepo struct {
	mock.Mock
}

func (m *MockCategoryRepo) Create(ctx context.Context, name, slug string, parentID *uuid.UUID, sortOrder int32) (*domain.Category, error) {
	args := m.Called(ctx, name, slug, parentID, sortOrder)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Category), args.Error(1)
}

func (m *MockCategoryRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Category, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Category), args.Error(1)
}

func (m *MockCategoryRepo) GetBySlug(ctx context.Context, slug string) (*domain.Category, error) {
	args := m.Called(ctx, slug)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Category), args.Error(1)
}

func (m *MockCategoryRepo) List(ctx context.Context) ([]*domain.Category, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.Category), args.Error(1)
}

func (m *MockCategoryRepo) Update(ctx context.Context, id uuid.UUID, name, slug string, parentID *uuid.UUID, sortOrder int32, isActive bool) (*domain.Category, error) {
	args := m.Called(ctx, id, name, slug, parentID, sortOrder, isActive)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Category), args.Error(1)
}

func (m *MockCategoryRepo) Delete(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

// --- 2. TEST SUITE ---

type CategoryServiceTestSuite struct {
	suite.Suite
	mockRepo *MockCategoryRepo
	service  CategoryService
}

func (s *CategoryServiceTestSuite) SetupTest() {
	s.mockRepo = new(MockCategoryRepo)
	s.service = NewCategoryService(nil, s.mockRepo)
}

// --- 3. TEST METHODS ---

func (s *CategoryServiceTestSuite) TestCreateCategory() {
	ctx := context.Background()
	req := dto.CreateCategoryRequest{
		Name:      "Cakes & Pastries",
		ParentID:  nil,
		SortOrder: 1,
	}
	expectedSlug := "cakes-pastries"

	cat := &domain.Category{
		ID:        uuid.New(),
		Name:      req.Name,
		Slug:      expectedSlug,
		ParentID:  req.ParentID,
		SortOrder: req.SortOrder,
		IsActive:  true,
	}

	s.Run("Success", func() {
		s.mockRepo.On("Create", ctx, req.Name, expectedSlug, req.ParentID, req.SortOrder).Return(cat, nil).Once()

		res, err := s.service.CreateCategory(ctx, req)

		s.NoError(err)
		s.Equal(cat.ID, res.ID)
		s.Equal(cat.Name, res.Name)
		s.Equal(cat.Slug, res.Slug)
		s.mockRepo.AssertExpectations(s.T())
	})

	s.Run("Repository Error", func() {
		s.mockRepo.On("Create", ctx, req.Name, expectedSlug, req.ParentID, req.SortOrder).Return(nil, apperrors.Internal("db error", nil)).Once()

		_, err := s.service.CreateCategory(ctx, req)

		s.Error(err)
		appErr := err.(*apperrors.AppError)
		s.Equal(apperrors.CodeInternal, appErr.Code)
		s.mockRepo.AssertExpectations(s.T())
	})
}

func (s *CategoryServiceTestSuite) TestGetCategory() {
	ctx := context.Background()
	id := uuid.New()

	cat := &domain.Category{
		ID:   id,
		Name: "Test Cat",
	}

	s.Run("Success", func() {
		s.mockRepo.On("GetByID", ctx, id).Return(cat, nil).Once()

		res, err := s.service.GetCategory(ctx, id)

		s.NoError(err)
		s.Equal(cat.ID, res.ID)
		s.mockRepo.AssertExpectations(s.T())
	})

	s.Run("Not Found", func() {
		s.mockRepo.On("GetByID", ctx, id).Return(nil, nil).Once()

		_, err := s.service.GetCategory(ctx, id)

		s.Error(err)
		appErr := err.(*apperrors.AppError)
		s.Equal(apperrors.CodeNotFound, appErr.Code)
		s.mockRepo.AssertExpectations(s.T())
	})
}

func (s *CategoryServiceTestSuite) TestUpdateCategory() {
	ctx := context.Background()
	id := uuid.New()
	req := dto.UpdateCategoryRequest{
		Name:      "Updated Name",
		ParentID:  nil,
		SortOrder: 2,
		IsActive:  true,
	}
	expectedSlug := "updated-name"

	cat := &domain.Category{
		ID:   id,
		Name: req.Name,
		Slug: expectedSlug,
	}

	s.Run("Success", func() {
		s.mockRepo.On("GetByID", ctx, id).Return(cat, nil).Once()
		s.mockRepo.On("Update", ctx, id, req.Name, expectedSlug, req.ParentID, req.SortOrder, req.IsActive).Return(cat, nil).Once()

		res, err := s.service.UpdateCategory(ctx, id, req)

		s.NoError(err)
		s.Equal(cat.Name, res.Name)
		s.mockRepo.AssertExpectations(s.T())
	})

	s.Run("Circular Reference", func() {
		s.mockRepo.On("GetByID", ctx, id).Return(cat, nil).Once()
		invalidReq := dto.UpdateCategoryRequest{
			ParentID: &id,
		}
		_, err := s.service.UpdateCategory(ctx, id, invalidReq)

		s.Error(err)
		appErr := err.(*apperrors.AppError)
		s.Equal(apperrors.CodeValidation, appErr.Code)
	})
}

func TestCategoryServiceSuite(t *testing.T) {
	suite.Run(t, new(CategoryServiceTestSuite))
}
