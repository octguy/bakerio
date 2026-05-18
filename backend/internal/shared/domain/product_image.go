package domain

import (
	"time"

	"github.com/google/uuid"
)

type ProductImage struct {
	ID        uuid.UUID
	ProductID uuid.UUID
	Url       string
	IsPrimary bool
	SortOrder int32
	CreatedAt time.Time
	CreatedBy *uuid.UUID
}
