package dto

import (
	"time"

	"github.com/google/uuid"
)

type CreateCategoryRequest struct {
	Name      string `json:"name"       binding:"required,max=100"`
	SortOrder int32  `json:"sort_order"`
} // @name CreateCategoryRequest

type UpdateCategoryRequest struct {
	Name      string `json:"name"       binding:"required,max=100"`
	SortOrder int32  `json:"sort_order"`
	IsActive  bool   `json:"is_active"`
} // @name UpdateCategoryRequest

type CategoryResponse struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	SortOrder int32     `json:"sort_order"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
} // @name CategoryResponse

// CategoryListFilter holds optional search params for GET /categories.
type CategoryListFilter struct {
	Q string // matches name OR slug (ILIKE %q%)
}
