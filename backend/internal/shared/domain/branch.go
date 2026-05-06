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
    CreatedAt time.Time
}