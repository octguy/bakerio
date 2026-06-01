package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	productdb "github.com/octguy/bakerio/backend/db/sqlc/product"
	"github.com/octguy/bakerio/backend/internal/product/dto"
	"github.com/octguy/bakerio/backend/internal/shared/authcontext"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
	"github.com/octguy/bakerio/backend/pkg/dbq"
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
	ListByCategorySlug(ctx context.Context, slug string, limit, offset int32) ([]*domain.Product, error)
	CountByCategorySlug(ctx context.Context, slug string) (int64, error)
	Update(ctx context.Context, id uuid.UUID, name, slug string, categoryID uuid.UUID, price decimal.Decimal, sortOrder int32, isActive bool) (*domain.Product, error)
	Delete(ctx context.Context, id uuid.UUID) error
	GetActiveByIDs(ctx context.Context, ids []uuid.UUID) ([]*domain.Product, error)

	// branch_products (per-branch availability)
	FanoutToBranches(ctx context.Context, productID uuid.UUID, branchIDs []uuid.UUID) error
	SeedBranch(ctx context.Context, branchID uuid.UUID) error
	GetBranchProduct(ctx context.Context, productID, branchID uuid.UUID) (*domain.BranchProduct, error)
	SetBranchProductActive(ctx context.Context, productID, branchID uuid.UUID, active bool) (*domain.BranchProduct, error)
	ListActiveProductsByBranch(ctx context.Context, branchID uuid.UUID) ([]*domain.Product, error)

	// product_images
	CreateImage(ctx context.Context, productID uuid.UUID, key string, altText *string, sortOrder int32) (*domain.ProductImage, error)
	ListImages(ctx context.Context, productID uuid.UUID) ([]*domain.ProductImage, error)
	GetImage(ctx context.Context, id uuid.UUID) (*domain.ProductImage, error)
	DeleteImage(ctx context.Context, id uuid.UUID) error

	// search (dynamic WHERE — see SearchProducts / CountSearchProducts)
	SearchProducts(ctx context.Context, f dto.ProductListFilter, limit, offset int32) ([]*domain.Product, error)
	CountSearchProducts(ctx context.Context, f dto.ProductListFilter) (int64, error)
}

type productRepo struct {
	db   *productdb.Queries
	pool *pgxpool.Pool // for dynamic search queries
}

func NewProductRepository(pool *pgxpool.Pool) ProductRepository {
	return &productRepo{db: productdb.New(pool), pool: pool}
}

// productSearchWhereAndJoin returns the WHERE builder and any JOIN clause
// needed for the filter (a category-slug filter triggers a JOIN to categories).
// Shared by SearchProducts + CountSearchProducts so they filter identically.
func productSearchWhereAndJoin(f dto.ProductListFilter) (*dbq.Where, string) {
	w := dbq.NewWhere()
	join := ""

	w.AddRaw("p.deleted_at IS NULL")

	if f.Q != "" {
		n := w.Next()
		w.AddRaw(fmt.Sprintf("(p.name ILIKE $%d OR p.slug ILIKE $%d)", n, n), "%"+f.Q+"%")
	}
	if f.CategorySlug != "" {
		join = " JOIN product.categories c ON p.category_id = c.id"
		w.AddIfNotEmpty("c.slug = ", f.CategorySlug)
	}
	if f.MinPrice != nil {
		w.Add("p.price >= ", *f.MinPrice)
	}
	if f.MaxPrice != nil {
		w.Add("p.price <= ", *f.MaxPrice)
	}
	if f.ActiveOnly {
		w.AddRaw("p.is_active = TRUE")
	}
	return w, join
}

func (r *productRepo) SearchProducts(ctx context.Context, f dto.ProductListFilter, limit, offset int32) ([]*domain.Product, error) {
	w, join := productSearchWhereAndJoin(f)
	limitN := w.Next()
	offsetN := limitN + 1
	args := append(w.Args(), limit, offset)
	sql := "SELECT p.id, p.name, p.slug, p.category_id, p.price, p.sort_order, p.is_active, " +
		"p.deleted_at, p.created_at, p.created_by, p.updated_at, p.updated_by " +
		"FROM product.products p" + join + w.SQL() +
		fmt.Sprintf(" ORDER BY p.sort_order ASC, p.name ASC LIMIT $%d OFFSET $%d", limitN, offsetN)

	rows, err := r.pool.Query(ctx, sql, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []productdb.ProductProduct
	for rows.Next() {
		var p productdb.ProductProduct
		if err := rows.Scan(&p.ID, &p.Name, &p.Slug, &p.CategoryID, &p.Price, &p.SortOrder,
			&p.IsActive, &p.DeletedAt, &p.CreatedAt, &p.CreatedBy, &p.UpdatedAt, &p.UpdatedBy); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	if rows.Err() != nil {
		return nil, rows.Err()
	}
	return toProductEntities(out), nil
}

func (r *productRepo) CountSearchProducts(ctx context.Context, f dto.ProductListFilter) (int64, error) {
	w, join := productSearchWhereAndJoin(f)
	sql := "SELECT COUNT(*) FROM product.products p" + join + w.SQL()
	var total int64
	if err := r.pool.QueryRow(ctx, sql, w.Args()...).Scan(&total); err != nil {
		return 0, err
	}
	return total, nil
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

func (r *productRepo) ListByCategorySlug(ctx context.Context, slug string, limit, offset int32) ([]*domain.Product, error) {
	rows, err := r.queries(ctx).ListProductsByCategorySlug(ctx, productdb.ListProductsByCategorySlugParams{
		Slug:   slug,
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		return nil, err
	}
	return toProductEntities(rows), nil
}

func (r *productRepo) CountByCategorySlug(ctx context.Context, slug string) (int64, error) {
	return r.queries(ctx).CountProductsByCategorySlug(ctx, slug)
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

func (r *productRepo) CreateImage(ctx context.Context, productID uuid.UUID, key string, altText *string, sortOrder int32) (*domain.ProductImage, error) {
	callerID, _ := authcontext.CallerID(ctx)
	row, err := r.queries(ctx).CreateProductImage(ctx, productdb.CreateProductImageParams{
		ProductID: productID,
		ImageUrl:  key,
		AltText:   altText,
		SortOrder: sortOrder,
		CreatedBy: nullableUUID(callerID),
	})
	if err != nil {
		return nil, err
	}
	return toImageEntity(&row), nil
}

func (r *productRepo) ListImages(ctx context.Context, productID uuid.UUID) ([]*domain.ProductImage, error) {
	rows, err := r.queries(ctx).ListImagesByProduct(ctx, productID)
	if err != nil {
		return nil, err
	}
	out := make([]*domain.ProductImage, 0, len(rows))
	for i := range rows {
		out = append(out, toImageEntity(&rows[i]))
	}
	return out, nil
}

func (r *productRepo) GetImage(ctx context.Context, id uuid.UUID) (*domain.ProductImage, error) {
	row, err := r.queries(ctx).GetProductImage(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return toImageEntity(&row), nil
}

func (r *productRepo) DeleteImage(ctx context.Context, id uuid.UUID) error {
	return r.queries(ctx).DeleteProductImage(ctx, id)
}

func toImageEntity(i *productdb.ProductProductImage) *domain.ProductImage {
	return &domain.ProductImage{
		ID:        i.ID,
		ProductID: i.ProductID,
		ImageKey:  i.ImageUrl,
		AltText:   i.AltText,
		SortOrder: i.SortOrder,
		CreatedAt: i.CreatedAt,
	}
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
