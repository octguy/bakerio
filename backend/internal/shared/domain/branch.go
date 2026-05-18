package domain

import (
	"time"

	"github.com/google/uuid"
)

type Branch struct {
	ID        uuid.UUID
	Name      string
	Address   string
	Lat       *float64
	Lng       *float64
	Status    string
	Region    string
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt *time.Time
	CreatedBy *uuid.UUID
	UpdatedBy *uuid.UUID
}
