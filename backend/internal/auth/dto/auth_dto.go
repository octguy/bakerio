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
} // @name RegisterRequest

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
} // @name LoginRequest

// Responses
type RegisterResponse struct {
	ID        uuid.UUID 	`json:"id"`
	Email     string    	`json:"email"`
	FullName  string    	`json:"full_name"`
	CreatedAt time.Time 	`json:"created_at"`
	BranchID  *uuid.UUID 	`json:"branch_id"`
} // @name RegisterResponse

type LoginResponse struct {
	AccessToken string `json:"access_token"`
} // @name LoginResponse

type VerifyEmailRequest struct {
	UserId uuid.UUID `json:"user_id" binding:"required"`
	OTP    string    `json:"otp" binding:"required,numeric,len=6"`
} // @name VerifyEmailRequest

type VerifyEmailResponse struct {
	Verified bool   `json:"verified"`
	Message  string `json:"message"`
} // @name VerifyEmailResponse

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" binding:"required,min=6"`
	NewPassword     string `json:"new_password" binding:"required,min=6"`
} // @name ChangePasswordRequest

type AdminSetPasswordRequest struct {
	Password string `json:"password" binding:"required,min=6"`
} // @name AdminSetPasswordRequest
