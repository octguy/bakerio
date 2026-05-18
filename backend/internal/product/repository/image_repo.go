package repository

import (
	"context"

	"github.com/google/uuid"
	productdb "github.com/octguy/bakerio/backend/db/sqlc/product"
	"github.com/octguy/bakerio/backend/internal/shared/authcontext"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
	"github.com/octguy/bakerio/backend/pkg/txmanager"
)

type ImageRepository interface {
	AddImage(ctx context.Context, productID uuid.UUID, url string, isPrimary bool, sortOrder int32) (*domain.ProductImage, error)
	ListByProduct(ctx context.Context, productID uuid.UUID) ([]*domain.ProductImage, error)
	SetPrimary(ctx context.Context, productID uuid.UUID, imageID uuid.UUID) error
	Delete(ctx context.Context, imageID uuid.UUID) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.ProductImage, error)
}

type imageRepo struct {
	db *productdb.Queries
}

func NewImageRepository(db *productdb.Queries) ImageRepository {
	return &imageRepo{db: db}
}

func (r *imageRepo) queries(ctx context.Context) *productdb.Queries {
	if tx, ok := txmanager.Extract(ctx); ok {
		return r.db.WithTx(tx)
	}
	return r.db
}

func (r *imageRepo) AddImage(ctx context.Context, productID uuid.UUID, url string, isPrimary bool, sortOrder int32) (*domain.ProductImage, error) {
	callerID, _ := authcontext.CallerID(ctx)

	row, err := r.queries(ctx).AddProductImage(ctx, productdb.AddProductImageParams{
		ProductID: productID,
		Url:       url,
		IsPrimary: isPrimary,
		SortOrder: sortOrder,
		CreatedBy: nullableUUID(callerID),
	})
	if err != nil {
		return nil, err
	}
	return toImageEntity(&row), nil
}

func (r *imageRepo) ListByProduct(ctx context.Context, productID uuid.UUID) ([]*domain.ProductImage, error) {
	rows, err := r.queries(ctx).ListProductImages(ctx, productID)
	if err != nil {
		return nil, err
	}

	result := make([]*domain.ProductImage, 0, len(rows))
	for _, row := range rows {
		result = append(result, toImageEntity(&row))
	}
	return result, nil
}

func (r *imageRepo) SetPrimary(ctx context.Context, productID uuid.UUID, imageID uuid.UUID) error {
	q := r.queries(ctx)
	if err := q.ClearPrimaryImage(ctx, productID); err != nil {
		return err
	}
	return q.SetPrimaryImage(ctx, imageID)
}

func (r *imageRepo) Delete(ctx context.Context, imageID uuid.UUID) error {
	return r.queries(ctx).DeleteProductImage(ctx, imageID)
}

func (r *imageRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.ProductImage, error) {
	row, err := r.queries(ctx).GetProductImageByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return toImageEntity(&row), nil
}

func toImageEntity(i *productdb.ProductProductImage) *domain.ProductImage {
	return &domain.ProductImage{
		ID:        i.ID,
		ProductID: i.ProductID,
		Url:       i.Url,
		IsPrimary: i.IsPrimary,
		SortOrder: i.SortOrder,
		CreatedAt: i.CreatedAt,
		CreatedBy: i.CreatedBy,
	}
}
