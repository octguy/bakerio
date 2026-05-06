package dto

import (
	"time"

	"github.com/google/uuid"
	profileDto "github.com/octguy/bakerio/backend/internal/profile/dto"
)

type CreateUserRequest struct {
	Email    string `json:"email"     binding:"required,email"`
	FullName string `json:"full_name"  binding:"required"`
	Password string `json:"password"   binding:"required,min=6"`
	Role     string `json:"role"       binding:"required"`
}

type CreateUserResponse struct {
	ID        uuid.UUID `json:"id"`
	Email     string    `json:"email"`
	FullName  string    `json:"full_name"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"created_at"`
}

type SetPasswordRequest struct {
	Password string `json:"password" binding:"required,min=6"`
}

// Re-export profile DTO aliases so user handler stays in its own package.
type ProfileResponse = profileDto.ProfileResponse
type UpdateProfileRequest = profileDto.UpdateProfileRequest
