package service

import (
	"context"
	"io"

	"github.com/google/uuid"
	"github.com/octguy/bakerio/backend/internal/platform/mediastore"
	"github.com/octguy/bakerio/backend/internal/product/dto"
	"github.com/octguy/bakerio/backend/internal/product/repository"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
	"github.com/octguy/bakerio/backend/pkg/txmanager"
)

type ImageService interface {
	UploadImage(ctx context.Context, productID uuid.UUID, r io.Reader, contentType string, isPrimary bool) (dto.ProductImageResponse, error)
	DeleteImage(ctx context.Context, imageID uuid.UUID) error
	SetPrimary(ctx context.Context, productID uuid.UUID, imageID uuid.UUID) error
}

type imageService struct {
	tx         txmanager.TransactionManager
	repo       repository.ImageRepository
	mediaStore mediastore.MediaStore
}

func NewImageService(tx txmanager.TransactionManager, repo repository.ImageRepository, ms mediastore.MediaStore) ImageService {
	return &imageService{
		tx:         tx,
		repo:       repo,
		mediaStore: ms,
	}
}

func (s *imageService) UploadImage(ctx context.Context, productID uuid.UUID, r io.Reader, contentType string, isPrimary bool) (dto.ProductImageResponse, error) {
	url, err := s.mediaStore.Upload(ctx, "products", r, contentType)
	if err != nil {
		return dto.ProductImageResponse{}, apperrors.Internal("failed to upload to media store", err)
	}

	var created *domain.ProductImage
	err = s.tx.WithTx(ctx, func(txCtx context.Context) error {
		img, err := s.repo.AddImage(txCtx, productID, url, isPrimary, 0)
		if err != nil {
			return err
		}
		created = img

		if isPrimary {
			return s.repo.SetPrimary(txCtx, productID, img.ID)
		}
		return nil
	})

	if err != nil {
		_ = s.mediaStore.Delete(ctx, url)
		return dto.ProductImageResponse{}, apperrors.Internal("database error", err)
	}

	return toImageResponse(created), nil
}

func (s *imageService) DeleteImage(ctx context.Context, imageID uuid.UUID) error {
	img, err := s.repo.GetByID(ctx, imageID)
	if err != nil {
		return apperrors.Internal("database error", err)
	}
	if img == nil {
		return apperrors.NotFound("image not found")
	}

	err = s.tx.WithTx(ctx, func(txCtx context.Context) error {
		return s.repo.Delete(txCtx, imageID)
	})

	if err != nil {
		return apperrors.Internal("database error", err)
	}

	return s.mediaStore.Delete(ctx, img.Url)
}

func (s *imageService) SetPrimary(ctx context.Context, productID uuid.UUID, imageID uuid.UUID) error {
	return s.tx.WithTx(ctx, func(txCtx context.Context) error {
		return s.repo.SetPrimary(txCtx, productID, imageID)
	})
}

func toImageResponse(i *domain.ProductImage) dto.ProductImageResponse {
	return dto.ProductImageResponse{
		ID:        i.ID,
		ProductID: i.ProductID,
		Url:       i.Url,
		IsPrimary: i.IsPrimary,
		SortOrder: i.SortOrder,
		CreatedAt: i.CreatedAt,
	}
}
