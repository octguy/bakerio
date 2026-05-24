package service

import (
	"context"

	"github.com/google/uuid"
	"github.com/octguy/bakerio/backend/internal/product/dto"
	"github.com/octguy/bakerio/backend/internal/product/repository"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
	"github.com/octguy/bakerio/backend/pkg/txmanager"
)

// BranchLister is the port the product module uses to read the set of branches
// when fanning out a newly-created product. The branch module provides the
// implementation (read-only, no shared transaction).
type BranchLister interface {
	ListBranchIDs(ctx context.Context) ([]uuid.UUID, error)
}

type ProductService interface {
	CreateProduct(ctx context.Context, req dto.CreateProductRequest) (dto.ProductResponse, error)
	GetProduct(ctx context.Context, id uuid.UUID) (dto.ProductResponse, error)
	GetProductBySlug(ctx context.Context, slug string) (dto.ProductResponse, error)
	ListProducts(ctx context.Context, categoryID *uuid.UUID, page, size int32) (dto.ProductListResponse, error)
	UpdateProduct(ctx context.Context, id uuid.UUID, req dto.UpdateProductRequest) (dto.ProductResponse, error)
	DeleteProduct(ctx context.Context, id uuid.UUID) error

	// GetActiveProducts is consumed by cart/order to validate & snapshot.
	GetActiveProducts(ctx context.Context, ids []uuid.UUID) ([]dto.ProductResponse, error)

	// SeedBranch fans out branch_products rows for a newly-created branch.
	// Satisfies branch.ProductSeeder; called by the branch module.
	SeedBranch(ctx context.Context, branchID uuid.UUID) error

	// SetBranchAvailability toggles a product's per-branch availability.
	SetBranchAvailability(ctx context.Context, productID, branchID uuid.UUID, active bool) (dto.BranchProductResponse, error)
}

type productService struct {
	tx           *txmanager.TxManager
	repo         repository.ProductRepository
	branchLister BranchLister
}

func NewProductService(tx *txmanager.TxManager, repo repository.ProductRepository, branchLister BranchLister) ProductService {
	return &productService{tx: tx, repo: repo, branchLister: branchLister}
}

func (s *productService) CreateProduct(ctx context.Context, req dto.CreateProductRequest) (dto.ProductResponse, error) {
	slug := slugify(req.Name)

	// Read the current branches first (cross-module read, no shared tx), then
	// create the product and fan out inactive availability rows in one tx.
	branchIDs, err := s.branchLister.ListBranchIDs(ctx)
	if err != nil {
		return dto.ProductResponse{}, apperrors.Internal("failed to list branches", err)
	}

	var product *domain.Product
	err = s.tx.WithTx(ctx, func(txCtx context.Context) error {
		p, err := s.repo.Create(txCtx, req.Name, slug, req.CategoryID, req.Price, req.SortOrder)
		if err != nil {
			return err
		}
		product = p
		return s.repo.FanoutToBranches(txCtx, p.ID, branchIDs)
	})
	if err != nil {
		return dto.ProductResponse{}, apperrors.Internal("failed to create product", err)
	}
	return toProductResponse(product), nil
}

func (s *productService) GetProduct(ctx context.Context, id uuid.UUID) (dto.ProductResponse, error) {
	p, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return dto.ProductResponse{}, apperrors.Internal("database error", err)
	}
	if p == nil {
		return dto.ProductResponse{}, apperrors.NotFound("product not found")
	}
	return toProductResponse(p), nil
}

func (s *productService) GetProductBySlug(ctx context.Context, slug string) (dto.ProductResponse, error) {
	p, err := s.repo.GetBySlug(ctx, slug)
	if err != nil {
		return dto.ProductResponse{}, apperrors.Internal("database error", err)
	}
	if p == nil {
		return dto.ProductResponse{}, apperrors.NotFound("product not found")
	}
	return toProductResponse(p), nil
}

func (s *productService) ListProducts(ctx context.Context, categoryID *uuid.UUID, page, size int32) (dto.ProductListResponse, error) {
	if page < 1 {
		page = 1
	}
	if size < 1 || size > 100 {
		size = 20
	}
	offset := (page - 1) * size

	var (
		items []*domain.Product
		total int64
		err   error
	)
	if categoryID != nil {
		items, err = s.repo.ListByCategory(ctx, *categoryID, size, offset)
		if err == nil {
			total, err = s.repo.CountByCategory(ctx, *categoryID)
		}
	} else {
		items, err = s.repo.List(ctx, size, offset)
		if err == nil {
			total, err = s.repo.Count(ctx)
		}
	}
	if err != nil {
		return dto.ProductListResponse{}, apperrors.Internal("failed to list products", err)
	}

	res := make([]dto.ProductResponse, 0, len(items))
	for _, p := range items {
		res = append(res, toProductResponse(p))
	}
	return dto.ProductListResponse{Items: res, Total: total, Page: page, Size: size}, nil
}

func (s *productService) UpdateProduct(ctx context.Context, id uuid.UUID, req dto.UpdateProductRequest) (dto.ProductResponse, error) {
	slug := slugify(req.Name)
	p, err := s.repo.Update(ctx, id, req.Name, slug, req.CategoryID, req.Price, req.SortOrder, req.IsActive)
	if err != nil {
		return dto.ProductResponse{}, apperrors.Internal("failed to update product", err)
	}
	return toProductResponse(p), nil
}

func (s *productService) DeleteProduct(ctx context.Context, id uuid.UUID) error {
	return s.repo.Delete(ctx, id)
}

func (s *productService) GetActiveProducts(ctx context.Context, ids []uuid.UUID) ([]dto.ProductResponse, error) {
	items, err := s.repo.GetActiveByIDs(ctx, ids)
	if err != nil {
		return nil, apperrors.Internal("failed to fetch products", err)
	}
	res := make([]dto.ProductResponse, 0, len(items))
	for _, p := range items {
		res = append(res, toProductResponse(p))
	}
	return res, nil
}

func (s *productService) SeedBranch(ctx context.Context, branchID uuid.UUID) error {
	return s.repo.SeedBranch(ctx, branchID)
}

func (s *productService) SetBranchAvailability(ctx context.Context, productID, branchID uuid.UUID, active bool) (dto.BranchProductResponse, error) {
	bp, err := s.repo.SetBranchProductActive(ctx, productID, branchID, active)
	if err != nil {
		return dto.BranchProductResponse{}, apperrors.Internal("failed to set availability", err)
	}
	if bp == nil {
		return dto.BranchProductResponse{}, apperrors.NotFound("product is not registered at this branch")
	}
	return dto.BranchProductResponse{ProductID: bp.ProductID, BranchID: bp.BranchID, IsActive: bp.IsActive}, nil
}

func toProductResponse(p *domain.Product) dto.ProductResponse {
	return dto.ProductResponse{
		ID:         p.ID,
		Name:       p.Name,
		Slug:       p.Slug,
		CategoryID: p.CategoryID,
		Price:      p.Price,
		SortOrder:  p.SortOrder,
		IsActive:   p.IsActive,
		CreatedAt:  p.CreatedAt,
		UpdatedAt:  p.UpdatedAt,
	}
}
