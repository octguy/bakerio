package dto

import (
	"time"

	"github.com/google/uuid"
	"github.com/octguy/bakerio/backend/pkg/pagination"
)

type CreateBranchRequest struct {
	Name    string   `json:"name" binding:"required,max=100"`
	Address string   `json:"address" binding:"required"`
	Lat     *float64 `json:"lat" binding:"omitempty,min=-90,max=90"`
	Lng     *float64 `json:"lng" binding:"omitempty,min=-180,max=180"`
} // @name CreateBranchRequest

type UpdateBranchRequest struct {
	Name    *string  `json:"name,omitempty" binding:"omitempty,max=100"`
	Address *string  `json:"address,omitempty" binding:"omitempty"`
	Lat     *float64 `json:"lat,omitempty" binding:"omitempty,min=-90,max=90"`
	Lng     *float64 `json:"lng,omitempty" binding:"omitempty,min=-180,max=180"`
} // @name UpdateBranchRequest

type UpdateStatusRequest struct {
	Status string `json:"status" binding:"required,oneof=active inactive"`
} // @name UpdateStatusRequest

type BranchResponse struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Address   string    `json:"address"`
	Lat       *float64  `json:"lat,omitempty"`
	Lng       *float64  `json:"lng,omitempty"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
} // @name BranchResponse

type BranchListResponse struct {
	Items []BranchResponse `json:"items"`
	pagination.Meta
} // @name BranchListResponse

type AssignMemberRequest struct {
	UserID uuid.UUID `json:"user_id" binding:"required"`
} // @name AssignMemberRequest

type MemberInfo struct {
	UserID      uuid.UUID `json:"user_id"`
	DisplayName string    `json:"display_name"`
	Email       string    `json:"email"`
	Roles       []string  `json:"roles"`
} // @name MemberInfo

type BranchMembersResponse struct {
	BranchID uuid.UUID    `json:"branch_id"`
	Members  []MemberInfo `json:"members"`
	pagination.Meta
} // @name BranchMembersResponse

type MembershipResponse struct {
	UserID   uuid.UUID `json:"user_id"`
	BranchID uuid.UUID `json:"branch_id"`
}
