package service

import (
	"context"
	"regexp"
	"strings"

	"github.com/google/uuid"
	"github.com/octguy/bakerio/backend/internal/product/dto"
	"github.com/octguy/bakerio/backend/internal/product/repository"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
	"github.com/octguy/bakerio/backend/pkg/txmanager"
)

type CategoryService interface {
	CreateCategory(ctx context.Context, req dto.CreateCategoryRequest) (dto.CategoryResponse, error)
	GetCategory(ctx context.Context, id uuid.UUID) (dto.CategoryResponse, error)
	GetCategoryBySlug(ctx context.Context, slug string) (dto.CategoryResponse, error)
	ListCategories(ctx context.Context) ([]dto.CategoryResponse, error)
	UpdateCategory(ctx context.Context, id uuid.UUID, req dto.UpdateCategoryRequest) (dto.CategoryResponse, error)
	DeleteCategory(ctx context.Context, id uuid.UUID) error
}

type categoryService struct {
	repo repository.CategoryRepository
	tx   *txmanager.TxManager
}

func NewCategoryService(tx *txmanager.TxManager, repo repository.CategoryRepository) CategoryService {
	return &categoryService{tx: tx, repo: repo}
}

func (s *categoryService) CreateCategory(ctx context.Context, req dto.CreateCategoryRequest) (dto.CategoryResponse, error) {
	slug := slugify(req.Name)

	category, err := s.repo.Create(ctx, req.Name, slug, req.SortOrder)
	if err != nil {
		return dto.CategoryResponse{}, apperrors.Internal("failed to create category", err)
	}

	return toCategoryResponse(category), nil
}

func (s *categoryService) GetCategory(ctx context.Context, id uuid.UUID) (dto.CategoryResponse, error) {
	category, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return dto.CategoryResponse{}, apperrors.Internal("database error", err)
	}
	if category == nil {
		return dto.CategoryResponse{}, apperrors.NotFound("category not found")
	}
	return toCategoryResponse(category), nil
}

func (s *categoryService) GetCategoryBySlug(ctx context.Context, slug string) (dto.CategoryResponse, error) {
	category, err := s.repo.GetBySlug(ctx, slug)
	if err != nil {
		return dto.CategoryResponse{}, apperrors.Internal("database error", err)
	}
	if category == nil {
		return dto.CategoryResponse{}, apperrors.NotFound("category not found")
	}
	return toCategoryResponse(category), nil
}

func (s *categoryService) ListCategories(ctx context.Context) ([]dto.CategoryResponse, error) {
	categories, err := s.repo.List(ctx)
	if err != nil {
		return nil, apperrors.Internal("failed to list categories", err)
	}

	res := make([]dto.CategoryResponse, 0, len(categories))
	for _, c := range categories {
		res = append(res, toCategoryResponse(c))
	}
	return res, nil
}

func (s *categoryService) UpdateCategory(ctx context.Context, id uuid.UUID, req dto.UpdateCategoryRequest) (dto.CategoryResponse, error) {
	slug := slugify(req.Name)
	category, err := s.repo.Update(ctx, id, req.Name, slug, req.SortOrder, req.IsActive)
	if err != nil {
		return dto.CategoryResponse{}, apperrors.Internal("failed to update category", err)
	}

	return toCategoryResponse(category), nil
}

func (s *categoryService) DeleteCategory(ctx context.Context, id uuid.UUID) error {
	return s.repo.Delete(ctx, id)
}

func toCategoryResponse(c *domain.Category) dto.CategoryResponse {
	return dto.CategoryResponse{
		ID:        c.ID,
		Name:      c.Name,
		Slug:      c.Slug,
		SortOrder: c.SortOrder,
		IsActive:  c.IsActive,
		CreatedAt: c.CreatedAt,
		UpdatedAt: c.UpdatedAt,
	}
}

var slugRegex = regexp.MustCompile("[^a-z0-9]+")

func slugify(s string) string {
	s = strings.ToLower(s)
	s = slugRegex.ReplaceAllString(s, "-")
	return strings.Trim(s, "-")
}
