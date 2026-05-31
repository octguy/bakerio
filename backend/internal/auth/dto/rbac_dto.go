package dto

import "github.com/google/uuid"

type RoleResponse struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	Description *string   `json:"description"`
} // @name RoleResponse

type CreateRoleRequest struct {
	Name        string  `json:"name"        binding:"required,max=50"`
	Description *string `json:"description"`
} // @name CreateRoleRequest

type UpdateRoleRequest struct {
	Name        string  `json:"name"        binding:"required,max=50"`
	Description *string `json:"description"`
} // @name UpdateRoleRequest

type PermissionResponse struct {
	ID   uuid.UUID `json:"id"`
	Name string    `json:"name"`
} // @name PermissionResponse

type UpdateRolePermissionsRequest struct {
	PermissionIDs []uuid.UUID `json:"permission_ids" binding:"required"`
} // @name UpdateRolePermissionsRequest
