package service

import (
	"context"
	"fmt"
	"io"

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

// ObjectStore is the port for blob storage (MinIO). The platform/storage client
// satisfies it.
type ObjectStore interface {
	Upload(ctx context.Context, key string, r io.Reader, size int64, contentType string) error
	Delete(ctx context.Context, key string) error
	PublicURL(key string) string
}

// ImageUpload is a single decoded file to attach to a product.
type ImageUpload struct {
	Reader      io.Reader
	Size        int64
	ContentType string
	Ext         string
	AltText     *string
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

	// Images
	AddImages(ctx context.Context, productID uuid.UUID, uploads []ImageUpload) ([]dto.ProductImageResponse, error)
	ListImages(ctx context.Context, productID uuid.UUID) ([]dto.ProductImageResponse, error)
	DeleteImage(ctx context.Context, imageID uuid.UUID) error
}

type productService struct {
	tx           *txmanager.TxManager
	repo         repository.ProductRepository
	branchLister BranchLister
	store        ObjectStore
}

func NewProductService(tx *txmanager.TxManager, repo repository.ProductRepository, branchLister BranchLister, store ObjectStore) ProductService {
	return &productService{tx: tx, repo: repo, branchLister: branchLister, store: store}
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

func (s *productService) AddImages(ctx context.Context, productID uuid.UUID, uploads []ImageUpload) ([]dto.ProductImageResponse, error) {
	product, err := s.repo.GetByID(ctx, productID)
	if err != nil {
		return nil, apperrors.Internal("database error", err)
	}
	if product == nil {
		return nil, apperrors.NotFound("product not found")
	}

	// New images sort after existing ones.
	existing, err := s.repo.ListImages(ctx, productID)
	if err != nil {
		return nil, apperrors.Internal("database error", err)
	}
	base := int32(len(existing))

	res := make([]dto.ProductImageResponse, 0, len(uploads))
	for i, u := range uploads {
		key := fmt.Sprintf("products/%s/%s%s", productID, uuid.NewString(), u.Ext)
		if err := s.store.Upload(ctx, key, u.Reader, u.Size, u.ContentType); err != nil {
			return res, apperrors.Internal("failed to upload image", err)
		}
		img, err := s.repo.CreateImage(ctx, productID, key, u.AltText, base+int32(i))
		if err != nil {
			// Best-effort cleanup of the just-uploaded object on DB failure.
			_ = s.store.Delete(ctx, key)
			return res, apperrors.Internal("failed to save image", err)
		}
		res = append(res, s.toImageResponse(img))
	}
	return res, nil
}

func (s *productService) ListImages(ctx context.Context, productID uuid.UUID) ([]dto.ProductImageResponse, error) {
	imgs, err := s.repo.ListImages(ctx, productID)
	if err != nil {
		return nil, apperrors.Internal("failed to list images", err)
	}
	res := make([]dto.ProductImageResponse, 0, len(imgs))
	for _, i := range imgs {
		res = append(res, s.toImageResponse(i))
	}
	return res, nil
}

func (s *productService) DeleteImage(ctx context.Context, imageID uuid.UUID) error {
	img, err := s.repo.GetImage(ctx, imageID)
	if err != nil {
		return apperrors.Internal("database error", err)
	}
	if img == nil {
		return apperrors.NotFound("image not found")
	}
	if err := s.repo.DeleteImage(ctx, imageID); err != nil {
		return apperrors.Internal("failed to delete image", err)
	}
	// Object removal is best-effort — a leftover blob is harmless.
	_ = s.store.Delete(ctx, img.ImageKey)
	return nil
}

func (s *productService) toImageResponse(i *domain.ProductImage) dto.ProductImageResponse {
	return dto.ProductImageResponse{
		ID:        i.ID,
		ProductID: i.ProductID,
		URL:       s.store.PublicURL(i.ImageKey),
		AltText:   i.AltText,
		SortOrder: i.SortOrder,
	}
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
