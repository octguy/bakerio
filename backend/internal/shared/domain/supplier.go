package domain

import (
	"time"

	"github.com/google/uuid"
)

type Supplier struct {
	ID          uuid.UUID
	Name        string
	ContactInfo *string
	Region      string
	IsActive    bool
	CreatedAt   time.Time
	UpdatedAt   time.Time
	DeletedAt   *time.Time
	CreatedBy   *uuid.UUID
	UpdatedBy   *uuid.UUID
}
