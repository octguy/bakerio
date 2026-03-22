package domain

import (
	"time"

	"github.com/google/uuid"
)

type Profile struct {
	ID          uuid.UUID
	UserID      uuid.UUID
	DisplayName string
	AvatarURL   *string
	Bio         *string
	UpdatedAt   time.Time
}
