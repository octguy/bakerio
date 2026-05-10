package dto

import (
	"time"

	"github.com/google/uuid"
)

type CreateUserRequest struct {
	Email    string `json:"email"     binding:"required,email"`
	FullName string `json:"full_name"  binding:"required"`
	Password string `json:"password"   binding:"required,min=6"`
	Role     string `json:"role"       binding:"required"`
} // @name CreateUserRequest

type CreateUserResponse struct {
	ID        uuid.UUID `json:"id"`
	Email     string    `json:"email"`
	FullName  string    `json:"full_name"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"created_at"`
} // @name CreateUserResponse

type SetPasswordRequest struct {
	Password string `json:"password" binding:"required,min=6"`
} // @name SetPasswordRequest
