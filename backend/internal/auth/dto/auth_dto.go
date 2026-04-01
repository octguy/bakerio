package dto

import (
	"time"

	"github.com/google/uuid"
)

// Requests
type RegisterRequest struct {
	Email    string `json:"email" binding:"required,email"`
	FullName string `json:"full_name" binding:"required"`
	Password string `json:"password" binding:"required,min=6"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

// Responses
type RegisterResponse struct {
	ID        uuid.UUID `json:"id"`
	Email     string    `json:"email"`
	FullName  string    `json:"full_name"`
	CreatedAt time.Time `json:"created_at"`
}

type LoginResponse struct {
	AccessToken string `json:"access_token"`
}

type VerifyEmailRequest struct {
	UserId uuid.UUID `json:"user_id" binding:"required"`
	OTP    string    `json:"otp" binding:"required,numeric,len=6"`
}

type VerifyEmailResponse struct {
	Verified bool   `json:"verified"`
	Message  string `json:"message"`
}
