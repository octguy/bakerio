package dto

import (
	"time"

	"github.com/google/uuid"
	"github.com/octguy/bakerio/backend/pkg/pagination"
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

type SetRoleRequest struct {
	Role     string     `json:"role" binding:"required"`
	BranchID *uuid.UUID `json:"branch_id" binding:"omitempty"`
} // @name SetRoleRequest

// UserListFilter holds optional search params for GET /users and GET /staff.
type UserListFilter struct {
	Q         string     // matches auth.users.email OR users.profiles.display_name (ILIKE %q%)
	Role      string     // exact role name (e.g. "branch_manager")
	BranchID  *uuid.UUID // user must be a member of this branch
	StaffOnly bool       // /staff path sets this — excludes pure-customer/guest accounts
}

// UserSummary is one row in /users and /staff list responses.
type UserSummary struct {
	UserID      uuid.UUID  `json:"user_id"`
	Email       string     `json:"email"`
	DisplayName string     `json:"display_name"`
	Roles       []string   `json:"roles"`
	BranchID    *uuid.UUID `json:"branch_id,omitempty"`
} // @name UserSummary

type UserListResponse struct {
	Items []UserSummary `json:"items"`
	pagination.Meta
} // @name UserListResponse
