package domain

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID            uuid.UUID
	Email         string
	EmailVerified bool
	IsActive      bool
	DeletedAt     *time.Time
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

type AuthCredential struct {
	ID                uuid.UUID
	UserID            uuid.UUID
	PasswordHash      string
	PasswordChangedAt time.Time
}
