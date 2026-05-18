package service

import (
	"context"

	"github.com/google/uuid"
	"github.com/octguy/bakerio/backend/internal/procurement/dto"
	"github.com/octguy/bakerio/backend/internal/procurement/repository"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
)

type SupplierService interface {
	Create(ctx context.Context, req dto.CreateSupplierRequest) (dto.SupplierResponse, error)
	Get(ctx context.Context, id uuid.UUID) (dto.SupplierResponse, error)
	List(ctx context.Context, region string) ([]dto.SupplierResponse, error)
	Update(ctx context.Context, id uuid.UUID, req dto.UpdateSupplierRequest) (dto.SupplierResponse, error)
	Delete(ctx context.Context, id uuid.UUID) error
}

type supplierService struct {
	repo repository.SupplierRepository
}

func NewSupplierService(repo repository.SupplierRepository) SupplierService {
	return &supplierService{repo: repo}
}

func (s *supplierService) Create(ctx context.Context, req dto.CreateSupplierRequest) (dto.SupplierResponse, error) {
	supplier := &domain.Supplier{
		Name:        req.Name,
		ContactInfo: &req.ContactInfo,
		Region:      req.Region,
	}

	created, err := s.repo.Create(ctx, supplier)
	if err != nil {
		return dto.SupplierResponse{}, apperrors.Internal("failed to create supplier", err)
	}

	return toSupplierResponse(created), nil
}

func (s *supplierService) Get(ctx context.Context, id uuid.UUID) (dto.SupplierResponse, error) {
	supplier, err := s.repo.GetByID(ctx, id)
	if err != nil || supplier == nil {
		return dto.SupplierResponse{}, apperrors.NotFound("supplier not found")
	}
	return toSupplierResponse(supplier), nil
}

func (s *supplierService) List(ctx context.Context, region string) ([]dto.SupplierResponse, error) {
	suppliers, err := s.repo.ListByRegion(ctx, region)
	if err != nil {
		return nil, apperrors.Internal("failed to list suppliers", err)
	}

	res := make([]dto.SupplierResponse, 0, len(suppliers))
	for _, sup := range suppliers {
		res = append(res, toSupplierResponse(sup))
	}
	return res, nil
}

func (s *supplierService) Update(ctx context.Context, id uuid.UUID, req dto.UpdateSupplierRequest) (dto.SupplierResponse, error) {
	current, err := s.repo.GetByID(ctx, id)
	if err != nil || current == nil {
		return dto.SupplierResponse{}, apperrors.NotFound("supplier not found")
	}

	if req.Name != nil {
		current.Name = *req.Name
	}
	if req.ContactInfo != nil {
		current.ContactInfo = req.ContactInfo
	}
	if req.Region != nil {
		current.Region = *req.Region
	}
	if req.IsActive != nil {
		current.IsActive = *req.IsActive
	}

	updated, err := s.repo.Update(ctx, current)
	if err != nil {
		return dto.SupplierResponse{}, apperrors.Internal("failed to update supplier", err)
	}

	return toSupplierResponse(updated), nil
}

func (s *supplierService) Delete(ctx context.Context, id uuid.UUID) error {
	sup, err := s.repo.GetByID(ctx, id)
	if err != nil || sup == nil {
		return apperrors.NotFound("supplier not found")
	}
	if err := s.repo.Delete(ctx, id); err != nil {
		return apperrors.Internal("failed to delete supplier", err)
	}
	return nil
}

func toSupplierResponse(s *domain.Supplier) dto.SupplierResponse {
	return dto.SupplierResponse{
		ID:          s.ID,
		Name:        s.Name,
		ContactInfo: s.ContactInfo,
		Region:      s.Region,
		IsActive:    s.IsActive,
		CreatedAt:   s.CreatedAt,
		UpdatedAt:   s.UpdatedAt,
	}
}
