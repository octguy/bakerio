package dto

import (
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

type AddItemRequest struct {
	ProductID uuid.UUID `json:"product_id" binding:"required"`
	Quantity  int32     `json:"quantity"   binding:"required,min=1,max=99"`
} // @name AddItemRequest

type UpdateItemRequest struct {
	// 0 removes the item; 1..99 sets the quantity.
	Quantity int32 `json:"quantity" binding:"min=0,max=99"`
} // @name UpdateItemRequest

type CartItemResponse struct {
	ProductID uuid.UUID       `json:"product_id"`
	Name      string          `json:"name"`
	Price     decimal.Decimal `json:"price"`
	Quantity  int32           `json:"quantity"`
	LineTotal decimal.Decimal `json:"line_total"`
	Available bool            `json:"available"`
} // @name CartItemResponse

type CartResponse struct {
	Items []CartItemResponse `json:"items"`
	Total decimal.Decimal    `json:"total"`
	Count int                `json:"count"`
} // @name CartResponse
