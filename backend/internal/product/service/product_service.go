package service

import (
	"context"

	"github.com/google/uuid"
	"github.com/octguy/bakerio/backend/internal/product/dto"
	"github.com/octguy/bakerio/backend/internal/product/repository"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
	"github.com/octguy/bakerio/backend/internal/shared/slug"
	"github.com/octguy/bakerio/backend/pkg/txmanager"
)

type ProductService interface {
	CreateProduct(ctx context.Context, req dto.CreateProductRequest) (dto.ProductResponse, error)
	GetProduct(ctx context.Context, id uuid.UUID) (dto.ProductResponse, error)
	ListProducts(ctx context.Context) ([]dto.ProductResponse, error)
	UpdateProduct(ctx context.Context, id uuid.UUID, req dto.UpdateProductRequest) (dto.ProductResponse, error)
	DeleteProduct(ctx context.Context, id uuid.UUID) error

	SetPrice(ctx context.Context, productID uuid.UUID, req dto.SetPriceRequest) (dto.ProductPriceResponse, error)
	GetPriceHistory(ctx context.Context, id uuid.UUID) ([]dto.ProductPriceHistoryResponse, error)
}

type productService struct {
	tx        txmanager.TransactionManager
	repo      repository.ProductRepository
	imageRepo repository.ImageRepository
}

func NewProductService(tx txmanager.TransactionManager, repo repository.ProductRepository, imageRepo repository.ImageRepository) ProductService {
	return &productService{tx: tx, repo: repo, imageRepo: imageRepo}
}

func (s *productService) CreateProduct(ctx context.Context, req dto.CreateProductRequest) (dto.ProductResponse, error) {
	var product *domain.Product
	err := s.tx.WithTx(ctx, func(txCtx context.Context) error {
		p := &domain.Product{
			SKU:         req.SKU,
			Name:        req.Name,
			Slug:        slug.Make(req.Name),
			Description: req.Description,
			CategoryID:  req.CategoryID,
			Unit:        req.Unit,
			BasePrice:   *req.Price,
			IsActive:    true,
		}

		created, err := s.repo.Create(txCtx, p)
		if err != nil {
			return apperrors.Internal("failed to create product", err)
		}
		product = created

		// Record initial price history (Global)
		return s.repo.InsertPriceHistory(txCtx, created.ID, nil, *req.Price)
	})

	if err != nil {
		return dto.ProductResponse{}, err
	}

	return toProductResponse(product), nil
}

func (s *productService) GetProduct(ctx context.Context, id uuid.UUID) (dto.ProductResponse, error) {
	product, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return dto.ProductResponse{}, apperrors.Internal("database error", err)
	}
	if product == nil {
		return dto.ProductResponse{}, apperrors.NotFound("product not found")
	}

	// Fetch images
	images, err := s.imageRepo.ListByProduct(ctx, id)
	if err == nil {
		product.Images = images
	}

	return toProductResponse(product), nil
}

func (s *productService) ListProducts(ctx context.Context) ([]dto.ProductResponse, error) {
	products, err := s.repo.List(ctx)
	if err != nil {
		return nil, apperrors.Internal("failed to list products", err)
	}

	res := make([]dto.ProductResponse, 0, len(products))
	for _, p := range products {
		res = append(res, toProductResponse(p))
	}
	return res, nil
}

func (s *productService) UpdateProduct(ctx context.Context, id uuid.UUID, req dto.UpdateProductRequest) (dto.ProductResponse, error) {
	var product *domain.Product
	err := s.tx.WithTx(ctx, func(txCtx context.Context) error {
		current, err := s.repo.GetByID(txCtx, id)
		if err != nil {
			return apperrors.Internal("database error", err)
		}
		if current == nil {
			return apperrors.NotFound("product not found")
		}

		if req.Name != nil {
			current.Name = *req.Name
			current.Slug = slug.Make(*req.Name)
			// TODO: Check slug uniqueness if it changed
		}
		if req.Description != nil {
			current.Description = req.Description
		}
		if req.CategoryID != nil {
			current.CategoryID = req.CategoryID
		}
		if req.Unit != nil {
			current.Unit = *req.Unit
		}
		if req.IsActive != nil {
			current.IsActive = *req.IsActive
		}
		if req.BasePrice != nil {
			current.BasePrice = *req.BasePrice
			if err := s.repo.InsertPriceHistory(txCtx, current.ID, nil, *req.BasePrice); err != nil {
				return err
			}
		}

		updated, err := s.repo.Update(txCtx, current)
		if err != nil {
			return apperrors.Internal("failed to update product", err)
		}

		// Re-fetch with category and images
		full, err := s.repo.GetByID(txCtx, updated.ID)
		if err == nil {
			product = full
			images, _ := s.imageRepo.ListByProduct(txCtx, updated.ID)
			product.Images = images
		} else {
			product = updated
		}
		return nil
	})

	if err != nil {
		return dto.ProductResponse{}, err
	}

	return toProductResponse(product), nil
}

func (s *productService) DeleteProduct(ctx context.Context, id uuid.UUID) error {
	return s.repo.Delete(ctx, id)
}

func (s *productService) SetPrice(ctx context.Context, productID uuid.UUID, req dto.SetPriceRequest) (dto.ProductPriceResponse, error) {
	var res dto.ProductPriceResponse
	err := s.tx.WithTx(ctx, func(txCtx context.Context) error {
		if req.BranchID == uuid.Nil {
			return apperrors.Validation("branch_id required for price override. use UpdateProduct to change global price")
		}

		price, err := s.repo.SetPrice(txCtx, productID, req.BranchID, req.Price)
		if err != nil {
			return err
		}

		if err := s.repo.InsertPriceHistory(txCtx, productID, &req.BranchID, req.Price); err != nil {
			return err
		}

		res = dto.ProductPriceResponse{
			BranchID: price.BranchID,
			Price:    price.Price,
			IsActive: price.IsActive,
		}
		return nil
	})

	return res, err
}

func (s *productService) GetPriceHistory(ctx context.Context, id uuid.UUID) ([]dto.ProductPriceHistoryResponse, error) {
	history, err := s.repo.ListPriceHistory(ctx, id)
	if err != nil {
		return nil, apperrors.Internal("failed to fetch price history", err)
	}

	res := make([]dto.ProductPriceHistoryResponse, 0, len(history))
	for _, h := range history {
		res = append(res, dto.ProductPriceHistoryResponse{
			BranchID:    h.BranchID,
			Price:       h.Price,
			EffectiveAt: h.EffectiveAt,
			ChangedBy:   h.ChangedBy,
		})
	}
	return res, nil
}

func toProductResponse(p *domain.Product) dto.ProductResponse {
	res := dto.ProductResponse{
		ID:          p.ID,
		SKU:         p.SKU,
		Name:        p.Name,
		Slug:        p.Slug,
		Description: p.Description,
		BasePrice:   p.BasePrice,
		Unit:        p.Unit,
		IsActive:    p.IsActive,
		CreatedAt:   p.CreatedAt,
		UpdatedAt:   p.UpdatedAt,
	}

	if p.Category != nil {
		res.Category = &dto.CategoryResponse{
			ID:   p.Category.ID,
			Name: p.Category.Name,
			Slug: p.Category.Slug,
		}
	}

	if len(p.Images) > 0 {
		res.Images = make([]dto.ProductImageResponse, 0, len(p.Images))
		for _, img := range p.Images {
			res.Images = append(res.Images, dto.ProductImageResponse{
				ID:        img.ID,
				Url:       img.Url,
				IsPrimary: img.IsPrimary,
				SortOrder: img.SortOrder,
			})
		}
	}

	return res
}
