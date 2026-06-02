package domain

import (
	"time"

	"github.com/google/uuid"
)

type Address struct {
	ID        uuid.UUID
	UserID    uuid.UUID
	Address   string
	Latitude  float64
	Longitude float64
	IsDefault bool
	CreatedAt time.Time
	UpdatedAt time.Time
}
