package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	productdb "github.com/octguy/bakerio/backend/db/sqlc/product"
	"github.com/octguy/bakerio/backend/internal/shared/authcontext"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
	"github.com/octguy/bakerio/backend/pkg/txmanager"
	"github.com/shopspring/decimal"
)

type ProductRepository interface {
	Create(ctx context.Context, p *domain.Product) (*domain.Product, error)
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Product, error)
	GetBySlug(ctx context.Context, slug string) (*domain.Product, error)
	List(ctx context.Context) ([]*domain.Product, error)
	Update(ctx context.Context, p *domain.Product) (*domain.Product, error)
	Delete(ctx context.Context, id uuid.UUID) error

	// Price management
	SetPrice(ctx context.Context, productID, branchID uuid.UUID, price decimal.Decimal) (*domain.ProductPrice, error)
	GetPrice(ctx context.Context, productID, branchID uuid.UUID) (*domain.ProductPrice, error)
	ListPriceHistory(ctx context.Context, id uuid.UUID) ([]*domain.ProductPriceHistory, error)
	InsertPriceHistory(ctx context.Context, productID uuid.UUID, branchID *uuid.UUID, price decimal.Decimal) error
}

type productRepo struct {
	db *productdb.Queries
}

func NewProductRepository(db *productdb.Queries) ProductRepository {
	return &productRepo{db: db}
}

func (r *productRepo) queries(ctx context.Context) *productdb.Queries {
	if tx, ok := txmanager.Extract(ctx); ok {
		return r.db.WithTx(tx)
	}
	return r.db
}

func (r *productRepo) Create(ctx context.Context, p *domain.Product) (*domain.Product, error) {
	callerID, _ := authcontext.CallerID(ctx)

	row, err := r.queries(ctx).CreateProduct(ctx, productdb.CreateProductParams{
		Sku:         p.SKU,
		Name:        p.Name,
		Slug:        p.Slug,
		Description: p.Description,
		CategoryID:  p.CategoryID,
		Unit:        p.Unit,
		BasePrice:   p.BasePrice,
		CreatedBy:   nullableUUID(callerID),
		UpdatedBy:   nullableUUID(callerID),
	})
	if err != nil {
		return nil, err
	}
	return toProductEntity(&row), nil
}

func (r *productRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Product, error) {
	row, err := r.queries(ctx).GetProductWithCategoryByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return toProductEntityWithCategory(&row), nil
}

func (r *productRepo) GetBySlug(ctx context.Context, slug string) (*domain.Product, error) {
	row, err := r.queries(ctx).GetProductBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}
	return toProductEntity(&row), nil
}

func (r *productRepo) List(ctx context.Context) ([]*domain.Product, error) {
	rows, err := r.queries(ctx).ListProducts(ctx)
	if err != nil {
		return nil, err
	}

	result := make([]*domain.Product, 0, len(rows))
	for _, row := range rows {
		result = append(result, toProductEntityFromList(&row))
	}
	return result, nil
}

func (r *productRepo) Update(ctx context.Context, p *domain.Product) (*domain.Product, error) {
	callerID, _ := authcontext.CallerID(ctx)

	row, err := r.queries(ctx).UpdateProduct(ctx, productdb.UpdateProductParams{
		ID:          p.ID,
		Sku:         p.SKU,
		Name:        p.Name,
		Slug:        p.Slug,
		Description: p.Description,
		CategoryID:  p.CategoryID,
		Unit:        p.Unit,
		IsActive:    p.IsActive,
		BasePrice:   p.BasePrice,
		UpdatedBy:   nullableUUID(callerID),
	})
	if err != nil {
		return nil, err
	}
	return toProductEntity(&row), nil
}

func (r *productRepo) Delete(ctx context.Context, id uuid.UUID) error {
	callerID, _ := authcontext.CallerID(ctx)
	return r.queries(ctx).SoftDeleteProduct(ctx, productdb.SoftDeleteProductParams{
		ID:        id,
		UpdatedBy: nullableUUID(callerID),
	})
}

func (r *productRepo) SetPrice(ctx context.Context, productID, branchID uuid.UUID, price decimal.Decimal) (*domain.ProductPrice, error) {
	callerID, _ := authcontext.CallerID(ctx)

	row, err := r.queries(ctx).SetProductPrice(ctx, productdb.SetProductPriceParams{
		ProductID: productID,
		BranchID:  branchID,
		Price:     price,
		CreatedBy: nullableUUID(callerID),
		UpdatedBy: nullableUUID(callerID),
	})
	if err != nil {
		return nil, err
	}
	return toPriceEntity(&row), nil
}

func (r *productRepo) GetPrice(ctx context.Context, productID, branchID uuid.UUID) (*domain.ProductPrice, error) {
	row, err := r.queries(ctx).GetPriceByBranch(ctx, productdb.GetPriceByBranchParams{
		ProductID: productID,
		BranchID:  branchID,
	})
	if err != nil {
		return nil, err
	}
	return toPriceEntity(&row), nil
}

func (r *productRepo) ListPriceHistory(ctx context.Context, id uuid.UUID) ([]*domain.ProductPriceHistory, error) {
	rows, err := r.queries(ctx).ListPriceHistory(ctx, id)
	if err != nil {
		return nil, err
	}

	result := make([]*domain.ProductPriceHistory, 0, len(rows))
	for _, row := range rows {
		result = append(result, toPriceHistoryEntity(&row))
	}
	return result, nil
}

func (r *productRepo) InsertPriceHistory(ctx context.Context, productID uuid.UUID, branchID *uuid.UUID, price decimal.Decimal) error {
	callerID, _ := authcontext.CallerID(ctx)
	_, err := r.queries(ctx).InsertPriceHistory(ctx, productdb.InsertPriceHistoryParams{
		ProductID: productID,
		BranchID:  branchID,
		Price:     price,
		ChangedBy: nullableUUID(callerID),
	})
	return err
}

func toProductEntity(p *productdb.ProductProduct) *domain.Product {
	return &domain.Product{
		ID:          p.ID,
		SKU:         p.Sku,
		Name:        p.Name,
		Slug:        p.Slug,
		Description: p.Description,
		CategoryID:  p.CategoryID,
		BasePrice:   p.BasePrice,
		Unit:        p.Unit,
		IsActive:    p.IsActive,
		CreatedAt:   p.CreatedAt,
		UpdatedAt:   p.UpdatedAt,
		DeletedAt:   p.DeletedAt,
		CreatedBy:   p.CreatedBy,
		UpdatedBy:   p.UpdatedBy,
	}
}

func toProductEntityWithCategory(p *productdb.GetProductWithCategoryByIDRow) *domain.Product {
	res := &domain.Product{
		ID:          p.ID,
		SKU:         p.Sku,
		Name:        p.Name,
		Slug:        p.Slug,
		Description: p.Description,
		CategoryID:  p.CategoryID,
		BasePrice:   p.BasePrice,
		Unit:        p.Unit,
		IsActive:    p.IsActive,
		CreatedAt:   p.CreatedAt,
		UpdatedAt:   p.UpdatedAt,
		DeletedAt:   p.DeletedAt,
		CreatedBy:   p.CreatedBy,
		UpdatedBy:   p.UpdatedBy,
	}

	if p.CategoryID != nil && p.CategoryName != nil {
		res.Category = &domain.Category{
			ID:   *p.CategoryID,
			Name: *p.CategoryName,
			Slug: *p.CategorySlug,
		}
	}

	return res
}

func toProductEntityFromList(p *productdb.ListProductsRow) *domain.Product {
	res := &domain.Product{
		ID:          p.ID,
		SKU:         p.Sku,
		Name:        p.Name,
		Slug:        p.Slug,
		Description: p.Description,
		CategoryID:  p.CategoryID,
		BasePrice:   p.BasePrice,
		Unit:        p.Unit,
		IsActive:    p.IsActive,
		CreatedAt:   p.CreatedAt,
		UpdatedAt:   p.UpdatedAt,
		DeletedAt:   p.DeletedAt,
		CreatedBy:   p.CreatedBy,
		UpdatedBy:   p.UpdatedBy,
	}

	if p.CategoryID != nil && p.CategoryName != nil {
		res.Category = &domain.Category{
			ID:   *p.CategoryID,
			Name: *p.CategoryName,
			Slug: *p.CategorySlug,
		}
	}

	return res
}

func toPriceEntity(p *productdb.ProductProductPrice) *domain.ProductPrice {
	return &domain.ProductPrice{
		ID:        p.ID,
		ProductID: p.ProductID,
		BranchID:  p.BranchID,
		Price:     p.Price,
		IsActive:  p.IsActive,
		CreatedAt: p.CreatedAt,
		UpdatedAt: p.UpdatedAt,
		DeletedAt: p.DeletedAt,
		CreatedBy: p.CreatedBy,
		UpdatedBy: p.UpdatedBy,
	}
}

func toPriceHistoryEntity(p *productdb.ListPriceHistoryRow) *domain.ProductPriceHistory {
	return &domain.ProductPriceHistory{
		ID:          p.ID,
		ProductID:   p.ProductID,
		BranchID:    p.BranchID,
		Price:       p.Price,
		EffectiveAt: p.EffectiveAt,
		ChangedBy:   p.ChangedBy,
	}
}
