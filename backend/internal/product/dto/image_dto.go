package dto

import (
	"time"

	"github.com/google/uuid"
)

type ProductImageResponse struct {
	ID        uuid.UUID `json:"id"`
	ProductID uuid.UUID `json:"product_id"`
	Url       string    `json:"url"`
	IsPrimary bool      `json:"is_primary"`
	SortOrder int32     `json:"sort_order"`
	CreatedAt time.Time `json:"created_at"`
} // @name ProductImageResponse
