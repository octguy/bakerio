package domain

import (
	"time"

	"github.com/google/uuid"
)

type Profile struct {
	ID          uuid.UUID
	UserID      uuid.UUID
	DisplayName string
	Phone       *string
	Address     *string
	AvatarURL   *string
	Bio         *string
	CreatedAt   time.Time
	UpdatedAt   time.Time
}
