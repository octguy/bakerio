package dto

import (
	"time"

	"github.com/google/uuid"
)

type CreateAddressRequest struct {
	Address   string  `json:"address"   binding:"required"`
	Latitude  float64 `json:"latitude"  binding:"required,latitude"`
	Longitude float64 `json:"longitude" binding:"required,longitude"`
	IsDefault bool    `json:"is_default"`
} // @name CreateAddressRequest

type UpdateAddressRequest struct {
	Address   *string  `json:"address"   binding:"omitempty"`
	Latitude  *float64 `json:"latitude"  binding:"omitempty,latitude"`
	Longitude *float64 `json:"longitude" binding:"omitempty,longitude"`
} // @name UpdateAddressRequest

type AddressResponse struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"`
	Address   string    `json:"address"`
	Latitude  float64   `json:"latitude"`
	Longitude float64   `json:"longitude"`
	IsDefault bool      `json:"is_default"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
} // @name AddressResponse

type AddressListResponse struct {
	Items []AddressResponse `json:"items"`
} // @name AddressListResponse
