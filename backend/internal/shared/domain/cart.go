package domain

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

type Cart struct {
	ID        uuid.UUID
	UserID    uuid.UUID
	CreatedAt time.Time
	UpdatedAt time.Time
}

type CartItem struct {
	ID            uuid.UUID
	CartID        uuid.UUID
	ProductID     uuid.UUID
	Quantity      int32
	UnitPriceSnap decimal.Decimal
	AddedAt       time.Time
}
