package service

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/octguy/bakerio/backend/internal/procurement/dto"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/suite"
)

type SupplierServiceTestSuite struct {
	suite.Suite
	mockRepo *MockSupplierRepo
	service  SupplierService
}

func (s *SupplierServiceTestSuite) SetupTest() {
	s.mockRepo = new(MockSupplierRepo)
	s.service = NewSupplierService(s.mockRepo)
}

func (s *SupplierServiceTestSuite) TestCreateSupplier() {
	req := dto.CreateSupplierRequest{Name: "Sup 1", Region: "north"}
	sup := &domain.Supplier{ID: uuid.New(), Name: req.Name, Region: req.Region}

	s.Run("Success", func() {
		s.mockRepo.On("Create", mock.Anything, mock.MatchedBy(func(ds *domain.Supplier) bool {
			return ds.Name == req.Name && ds.Region == req.Region
		})).Return(sup, nil).Once()

		res, err := s.service.Create(context.Background(), req)
		s.NoError(err)
		s.Equal(sup.ID, res.ID)
		s.mockRepo.AssertExpectations(s.T())
	})
}

func (s *SupplierServiceTestSuite) TestGetSupplier() {
	id := uuid.New()
	sup := &domain.Supplier{ID: id, Name: "Sup 1"}

	s.Run("Success", func() {
		s.mockRepo.On("GetByID", mock.Anything, id).Return(sup, nil).Once()
		res, err := s.service.Get(context.Background(), id)
		s.NoError(err)
		s.Equal(id, res.ID)
		s.mockRepo.AssertExpectations(s.T())
	})

	s.Run("Not Found", func() {
		s.mockRepo.On("GetByID", mock.Anything, id).Return(nil, nil).Once()
		_, err := s.service.Get(context.Background(), id)
		s.Error(err)
		s.Equal(apperrors.CodeNotFound, err.(*apperrors.AppError).Code)
		s.mockRepo.AssertExpectations(s.T())
	})
}

func (s *SupplierServiceTestSuite) TestListSuppliers() {
	sups := []*domain.Supplier{{ID: uuid.New(), Name: "Sup 1"}}

	s.Run("Success", func() {
		s.mockRepo.On("ListByRegion", mock.Anything, "north").Return(sups, nil).Once()
		res, err := s.service.List(context.Background(), "north")
		s.NoError(err)
		s.Len(res, 1)
		s.mockRepo.AssertExpectations(s.T())
	})
}

func (s *SupplierServiceTestSuite) TestUpdateSupplier() {
	id := uuid.New()
	name := "Updated Sup"
	req := dto.UpdateSupplierRequest{Name: &name}
	sup := &domain.Supplier{ID: id, Name: "Old Sup", Region: "north"}

	s.Run("Success", func() {
		s.mockRepo.On("GetByID", mock.Anything, id).Return(sup, nil).Once()
		s.mockRepo.On("Update", mock.Anything, mock.MatchedBy(func(ds *domain.Supplier) bool {
			return ds.Name == name
		})).Return(&domain.Supplier{ID: id, Name: name, Region: "north"}, nil).Once()

		res, err := s.service.Update(context.Background(), id, req)
		s.NoError(err)
		s.Equal(name, res.Name)
		s.mockRepo.AssertExpectations(s.T())
	})

	s.Run("Not Found", func() {
		s.mockRepo.On("GetByID", mock.Anything, id).Return(nil, nil).Once()
		_, err := s.service.Update(context.Background(), id, req)
		s.Error(err)
		s.mockRepo.AssertExpectations(s.T())
	})
}

func (s *SupplierServiceTestSuite) TestDeleteSupplier() {
	id := uuid.New()

	s.Run("Success", func() {
		s.mockRepo.On("GetByID", mock.Anything, id).Return(&domain.Supplier{ID: id}, nil).Once()
		s.mockRepo.On("Delete", mock.Anything, id).Return(nil).Once()
		err := s.service.Delete(context.Background(), id)
		s.NoError(err)
		s.mockRepo.AssertExpectations(s.T())
	})
}

func TestSupplierServiceSuite(t *testing.T) {
	suite.Run(t, new(SupplierServiceTestSuite))
}
