package dto

import (
	"time"

	"github.com/google/uuid"
)

type CreateUserRequest struct {
	Email    string     `json:"email" binding:"required,email"`
	FullName string     `json:"full_name" binding:"required"`
	Password string     `json:"password" binding:"required,min=6"`
	Role     string     `json:"role" binding:"required"`
	BranchID *uuid.UUID `json:"branch_id" binding:"omitempty"`
} // @name CreateUserRequest

type CreateUserResponse struct {
	ID        uuid.UUID    `json:"id"`
	Email     string       `json:"email"`
	FullName  string       `json:"full_name"`
	Role      string       `json:"role"`
	Branch    *BranchBrief `json:"branch,omitempty"`
	CreatedAt time.Time    `json:"created_at"`
} // @name CreateUserResponse

// BranchBrief is the slice of branch info joined into user-facing responses.
type BranchBrief struct {
	ID      uuid.UUID `json:"id"`
	Name    string    `json:"name"`
	Address string    `json:"address"`
} // @name BranchBrief

type SetPasswordRequest struct {
	Password string `json:"password" binding:"required,min=6"`
} // @name SetPasswordRequest
