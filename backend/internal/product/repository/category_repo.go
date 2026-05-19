package repository

import (
	"context"

	"github.com/google/uuid"
	productdb "github.com/octguy/bakerio/backend/db/sqlc/product"
	"github.com/octguy/bakerio/backend/internal/shared/authcontext"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
	"github.com/octguy/bakerio/backend/pkg/txmanager"
)

type CategoryRepository interface {
	Create(ctx context.Context, name, slug string, parentID *uuid.UUID, sortOrder int32) (*domain.Category, error)
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Category, error)
	GetBySlug(ctx context.Context, slug string) (*domain.Category, error)
	List(ctx context.Context) ([]*domain.Category, error)
	Update(ctx context.Context, id uuid.UUID, name, slug string, parentID *uuid.UUID, sortOrder int32, isActive bool) (*domain.Category, error)
	Delete(ctx context.Context, id uuid.UUID) error
}

type categoryRepo struct {
	db *productdb.Queries
}

func NewCategoryRepository(db *productdb.Queries) CategoryRepository {
	return &categoryRepo{db: db}
}

func (r *categoryRepo) queries(ctx context.Context) *productdb.Queries {
	if tx, ok := txmanager.Extract(ctx); ok {
		return r.db.WithTx(tx)
	}
	return r.db
}

func (r *categoryRepo) Create(ctx context.Context, name, slug string, parentID *uuid.UUID, sortOrder int32) (*domain.Category, error) {
	callerID, _ := authcontext.CallerID(ctx)

	row, err := r.queries(ctx).CreateCategory(ctx, productdb.CreateCategoryParams{
		Name:      name,
		Slug:      slug,
		ParentID:  parentID,
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
		return nil, err
	}
	return toCategoryEntity(&row), nil
}

func (r *categoryRepo) GetBySlug(ctx context.Context, slug string) (*domain.Category, error) {
	row, err := r.queries(ctx).GetCategoryBySlug(ctx, slug)
	if err != nil {
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

func (r *categoryRepo) Update(ctx context.Context, id uuid.UUID, name, slug string, parentID *uuid.UUID, sortOrder int32, isActive bool) (*domain.Category, error) {
	callerID, _ := authcontext.CallerID(ctx)

	row, err := r.queries(ctx).UpdateCategory(ctx, productdb.UpdateCategoryParams{
		ID:        id,
		Name:      name,
		Slug:      slug,
		ParentID:  parentID,
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
		ParentID:  c.ParentID,
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
