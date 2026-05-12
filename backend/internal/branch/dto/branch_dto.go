package dto

import (
	"time"
	"github.com/google/uuid"
)

type CreateBranchRequest struct {
	Name	string		`json:"name"	binding:"required,max=100"`
	Address	string		`json:"address"	binding:"required"`
	Lat		*float64	`json:"lat"		binding:"omitempty,min=-90,max=90"`
	Lng		*float64	`json:"lng"		binding:"omitempty,min=-180,max=180"`
} // @name CreateBranchRequest

type UpdateBranchRequest struct {
	Name	*string		`json:"name,omitempty"		binding:"omitempty,max=100"`
	Address	*string		`json:"address,omitempty"	binding:"omitempty"`
	Lat		*float64	`json:"lat,omitempty"		binding:"omitempty,min=-90,max=90"`
	Lng		*float64	`json:"lng,omitempty"		binding:"omitempty,min=-180,max=180"`
} // @name UpdateBranchRequest

type UpdateStatusRequest struct {
	Status string `json:"status"		binding:"required,oneof=active inactive"`
} // @name UpdateStatusRequest

type BranchResponse struct {
	ID			uuid.UUID	`json:"id"`
	Name		string		`json:"name"`
	Address		string		`json:"address"`
	Lat			*float64	`json:"lat,omitempty"`
	Lng			*float64	`json:"lng,omitempty"`
	Status		string		`json:"status"`
	CreatedAt 	time.Time	`json:"created_at"`
} // @name BranchResponse