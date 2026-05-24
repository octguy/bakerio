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
	Create(ctx context.Context, name, slug string, categoryID uuid.UUID, price decimal.Decimal, sortOrder int32) (*domain.Product, error)
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Product, error)
	GetBySlug(ctx context.Context, slug string) (*domain.Product, error)
	List(ctx context.Context, limit, offset int32) ([]*domain.Product, error)
	Count(ctx context.Context) (int64, error)
	ListByCategory(ctx context.Context, categoryID uuid.UUID, limit, offset int32) ([]*domain.Product, error)
	CountByCategory(ctx context.Context, categoryID uuid.UUID) (int64, error)
	Update(ctx context.Context, id uuid.UUID, name, slug string, categoryID uuid.UUID, price decimal.Decimal, sortOrder int32, isActive bool) (*domain.Product, error)
	Delete(ctx context.Context, id uuid.UUID) error
	GetActiveByIDs(ctx context.Context, ids []uuid.UUID) ([]*domain.Product, error)

	// branch_products (per-branch availability)
	FanoutToBranches(ctx context.Context, productID uuid.UUID, branchIDs []uuid.UUID) error
	SeedBranch(ctx context.Context, branchID uuid.UUID) error
	GetBranchProduct(ctx context.Context, productID, branchID uuid.UUID) (*domain.BranchProduct, error)
	SetBranchProductActive(ctx context.Context, productID, branchID uuid.UUID, active bool) (*domain.BranchProduct, error)
	ListActiveProductsByBranch(ctx context.Context, branchID uuid.UUID) ([]*domain.Product, error)
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

func (r *productRepo) Create(ctx context.Context, name, slug string, categoryID uuid.UUID, price decimal.Decimal, sortOrder int32) (*domain.Product, error) {
	callerID, _ := authcontext.CallerID(ctx)
	row, err := r.queries(ctx).CreateProduct(ctx, productdb.CreateProductParams{
		Name:       name,
		Slug:       slug,
		CategoryID: categoryID,
		Price:      price,
		SortOrder:  sortOrder,
		CreatedBy:  nullableUUID(callerID),
	})
	if err != nil {
		return nil, err
	}
	return toProductEntity(&row), nil
}

func (r *productRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Product, error) {
	row, err := r.queries(ctx).GetProductByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return toProductEntity(&row), nil
}

func (r *productRepo) GetBySlug(ctx context.Context, slug string) (*domain.Product, error) {
	row, err := r.queries(ctx).GetProductBySlug(ctx, slug)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return toProductEntity(&row), nil
}

func (r *productRepo) List(ctx context.Context, limit, offset int32) ([]*domain.Product, error) {
	rows, err := r.queries(ctx).ListProducts(ctx, productdb.ListProductsParams{Limit: limit, Offset: offset})
	if err != nil {
		return nil, err
	}
	return toProductEntities(rows), nil
}

func (r *productRepo) Count(ctx context.Context) (int64, error) {
	return r.queries(ctx).CountProducts(ctx)
}

func (r *productRepo) ListByCategory(ctx context.Context, categoryID uuid.UUID, limit, offset int32) ([]*domain.Product, error) {
	rows, err := r.queries(ctx).ListProductsByCategory(ctx, productdb.ListProductsByCategoryParams{
		CategoryID: categoryID,
		Limit:      limit,
		Offset:     offset,
	})
	if err != nil {
		return nil, err
	}
	return toProductEntities(rows), nil
}

func (r *productRepo) CountByCategory(ctx context.Context, categoryID uuid.UUID) (int64, error) {
	return r.queries(ctx).CountProductsByCategory(ctx, categoryID)
}

func (r *productRepo) Update(ctx context.Context, id uuid.UUID, name, slug string, categoryID uuid.UUID, price decimal.Decimal, sortOrder int32, isActive bool) (*domain.Product, error) {
	callerID, _ := authcontext.CallerID(ctx)
	row, err := r.queries(ctx).UpdateProduct(ctx, productdb.UpdateProductParams{
		ID:         id,
		Name:       name,
		Slug:       slug,
		CategoryID: categoryID,
		Price:      price,
		SortOrder:  sortOrder,
		IsActive:   isActive,
		UpdatedBy:  nullableUUID(callerID),
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

func (r *productRepo) GetActiveByIDs(ctx context.Context, ids []uuid.UUID) ([]*domain.Product, error) {
	rows, err := r.queries(ctx).GetActiveProductsByIDs(ctx, ids)
	if err != nil {
		return nil, err
	}
	return toProductEntities(rows), nil
}

func (r *productRepo) FanoutToBranches(ctx context.Context, productID uuid.UUID, branchIDs []uuid.UUID) error {
	if len(branchIDs) == 0 {
		return nil
	}
	callerID, _ := authcontext.CallerID(ctx)
	return r.queries(ctx).FanoutProductToBranches(ctx, productdb.FanoutProductToBranchesParams{
		ProductID: productID,
		Column2:   branchIDs,
		CreatedBy: nullableUUID(callerID),
	})
}

func (r *productRepo) SeedBranch(ctx context.Context, branchID uuid.UUID) error {
	callerID, _ := authcontext.CallerID(ctx)
	return r.queries(ctx).SeedBranchProducts(ctx, productdb.SeedBranchProductsParams{
		BranchID:  branchID,
		CreatedBy: nullableUUID(callerID),
	})
}

func (r *productRepo) GetBranchProduct(ctx context.Context, productID, branchID uuid.UUID) (*domain.BranchProduct, error) {
	row, err := r.queries(ctx).GetBranchProduct(ctx, productdb.GetBranchProductParams{
		ProductID: productID,
		BranchID:  branchID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return toBranchProductEntity(&row), nil
}

func (r *productRepo) SetBranchProductActive(ctx context.Context, productID, branchID uuid.UUID, active bool) (*domain.BranchProduct, error) {
	callerID, _ := authcontext.CallerID(ctx)
	row, err := r.queries(ctx).SetBranchProductActive(ctx, productdb.SetBranchProductActiveParams{
		ProductID: productID,
		BranchID:  branchID,
		IsActive:  active,
		UpdatedBy: nullableUUID(callerID),
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return toBranchProductEntity(&row), nil
}

func (r *productRepo) ListActiveProductsByBranch(ctx context.Context, branchID uuid.UUID) ([]*domain.Product, error) {
	rows, err := r.queries(ctx).ListActiveProductsByBranch(ctx, branchID)
	if err != nil {
		return nil, err
	}
	return toProductEntities(rows), nil
}

func toProductEntity(p *productdb.ProductProduct) *domain.Product {
	return &domain.Product{
		ID:         p.ID,
		Name:       p.Name,
		Slug:       p.Slug,
		CategoryID: p.CategoryID,
		Price:      p.Price,
		SortOrder:  p.SortOrder,
		IsActive:   p.IsActive,
		DeletedAt:  p.DeletedAt,
		CreatedAt:  p.CreatedAt,
		CreatedBy:  p.CreatedBy,
		UpdatedAt:  p.UpdatedAt,
		UpdatedBy:  p.UpdatedBy,
	}
}

func toProductEntities(rows []productdb.ProductProduct) []*domain.Product {
	out := make([]*domain.Product, 0, len(rows))
	for i := range rows {
		out = append(out, toProductEntity(&rows[i]))
	}
	return out
}

func toBranchProductEntity(b *productdb.ProductBranchProduct) *domain.BranchProduct {
	return &domain.BranchProduct{
		ID:        b.ID,
		ProductID: b.ProductID,
		BranchID:  b.BranchID,
		IsActive:  b.IsActive,
		CreatedAt: b.CreatedAt,
		UpdatedAt: b.UpdatedAt,
	}
}
