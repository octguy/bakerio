package dto

import (
	"time"

	"github.com/google/uuid"
)

type CreateSupplierRequest struct {
	Name        string `json:"name" binding:"required,max=255"`
	ContactInfo string `json:"contact_info" binding:"omitempty"`
	Region      string `json:"region" binding:"required,oneof=north central south"`
} // @name CreateSupplierRequest

type UpdateSupplierRequest struct {
	Name        *string `json:"name,omitempty" binding:"omitempty,max=255"`
	ContactInfo *string `json:"contact_info,omitempty" binding:"omitempty"`
	Region      *string `json:"region,omitempty" binding:"omitempty,oneof=north central south"`
	IsActive    *bool   `json:"is_active,omitempty" binding:"omitempty"`
} // @name UpdateSupplierRequest

type SupplierResponse struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	ContactInfo *string   `json:"contact_info"`
	Region      string    `json:"region"`
	IsActive    bool      `json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
} // @name SupplierResponse
