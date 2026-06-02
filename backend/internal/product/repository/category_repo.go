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
)

type CategoryRepository interface {
	Create(ctx context.Context, name, slug string, sortOrder int32) (*domain.Category, error)
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Category, error)
	GetBySlug(ctx context.Context, slug string) (*domain.Category, error)
	List(ctx context.Context) ([]*domain.Category, error)
	Search(ctx context.Context, f dto.CategoryListFilter) ([]*domain.Category, error)
	Update(ctx context.Context, id uuid.UUID, name, slug string, sortOrder int32, isActive bool) (*domain.Category, error)
	Delete(ctx context.Context, id uuid.UUID) error
}

type categoryRepo struct {
	db   *productdb.Queries
	pool *pgxpool.Pool
}

func NewCategoryRepository(pool *pgxpool.Pool) CategoryRepository {
	return &categoryRepo{db: productdb.New(pool), pool: pool}
}

func (r *categoryRepo) Search(ctx context.Context, f dto.CategoryListFilter) ([]*domain.Category, error) {
	w := dbq.NewWhere()
	w.AddRaw("deleted_at IS NULL")
	if f.Q != "" {
		n := w.Next()
		w.AddRaw(fmt.Sprintf("(name ILIKE $%d OR slug ILIKE $%d)", n, n), "%"+f.Q+"%")
	}
	sql := "SELECT id, name, slug, sort_order, is_active, deleted_at, created_at, created_by, updated_at, updated_by " +
		"FROM product.categories" + w.SQL() + " ORDER BY sort_order ASC, name ASC"

	rows, err := r.pool.Query(ctx, sql, w.Args()...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []*domain.Category
	for rows.Next() {
		var c productdb.ProductCategory
		if err := rows.Scan(&c.ID, &c.Name, &c.Slug, &c.SortOrder, &c.IsActive,
			&c.DeletedAt, &c.CreatedAt, &c.CreatedBy, &c.UpdatedAt, &c.UpdatedBy); err != nil {
			return nil, err
		}
		out = append(out, toCategoryEntity(&c))
	}
	if rows.Err() != nil {
		return nil, rows.Err()
	}
	return out, nil
}

func (r *categoryRepo) queries(ctx context.Context) *productdb.Queries {
	if tx, ok := txmanager.Extract(ctx); ok {
		return r.db.WithTx(tx)
	}
	return r.db
}

func (r *categoryRepo) Create(ctx context.Context, name, slug string, sortOrder int32) (*domain.Category, error) {
	callerID, _ := authcontext.CallerID(ctx)

	row, err := r.queries(ctx).CreateCategory(ctx, productdb.CreateCategoryParams{
		Name:      name,
		Slug:      slug,
		SortOrder: sortOrder,
		CreatedBy: nullableUUID(callerID),
		UpdatedBy: nullableUUID(callerID),
	})
	if err != nil {
		return nil, err
	}
	return toCategoryEntity(&row), nil
}

func (r *categoryRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Category, error) {
	row, err := r.queries(ctx).GetCategoryByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return toCategoryEntity(&row), nil
}

func (r *categoryRepo) GetBySlug(ctx context.Context, slug string) (*domain.Category, error) {
	row, err := r.queries(ctx).GetCategoryBySlug(ctx, slug)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return toCategoryEntity(&row), nil
}

func (r *categoryRepo) List(ctx context.Context) ([]*domain.Category, error) {
	rows, err := r.queries(ctx).ListCategories(ctx)
	if err != nil {
		return nil, err
	}

	result := make([]*domain.Category, 0, len(rows))
	for _, row := range rows {
		result = append(result, toCategoryEntity(&row))
	}
	return result, nil
}

func (r *categoryRepo) Update(ctx context.Context, id uuid.UUID, name, slug string, sortOrder int32, isActive bool) (*domain.Category, error) {
	callerID, _ := authcontext.CallerID(ctx)

	row, err := r.queries(ctx).UpdateCategory(ctx, productdb.UpdateCategoryParams{
		ID:        id,
		Name:      name,
		Slug:      slug,
		SortOrder: sortOrder,
		IsActive:  isActive,
		UpdatedBy: nullableUUID(callerID),
	})
	if err != nil {
		return nil, err
	}
	return toCategoryEntity(&row), nil
}

func (r *categoryRepo) Delete(ctx context.Context, id uuid.UUID) error {
	callerID, _ := authcontext.CallerID(ctx)
	return r.queries(ctx).SoftDeleteCategory(ctx, productdb.SoftDeleteCategoryParams{
		ID:        id,
		UpdatedBy: nullableUUID(callerID),
	})
}

func toCategoryEntity(c *productdb.ProductCategory) *domain.Category {
	return &domain.Category{
		ID:        c.ID,
		Name:      c.Name,
		Slug:      c.Slug,
		SortOrder: c.SortOrder,
		IsActive:  c.IsActive,
		DeletedAt: c.DeletedAt,
		CreatedAt: c.CreatedAt,
		CreatedBy: c.CreatedBy,
		UpdatedAt: c.UpdatedAt,
		UpdatedBy: c.UpdatedBy,
	}
}

func nullableUUID(id uuid.UUID) *uuid.UUID {
	if id == uuid.Nil {
		return nil
	}
	return &id
}
