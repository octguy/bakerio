package dto

import "github.com/google/uuid"

type UpdateProfileRequest struct {
	DisplayName *string `json:"display_name"`
	Phone       *string `json:"phone"`
	Address     *string `json:"address"`
	AvatarURL   *string `json:"avatar_url"`
	Bio         *string `json:"bio"`
} // @name UpdateProfileRequest

type ProfileResponse struct {
	ID          uuid.UUID `json:"id"`
	UserID      uuid.UUID `json:"user_id"`
	DisplayName string    `json:"display_name"`
	Phone       *string   `json:"phone"`
	Address     *string   `json:"address"`
	AvatarURL   *string   `json:"avatar_url"`
	Bio         *string   `json:"bio"`
	// Staff-only enrichment. Omitted for plain customers so their response
	// stays unchanged.
	Roles  []string     `json:"roles,omitempty"`
	Branch *BranchBrief `json:"branch,omitempty"`
} // @name ProfileResponse
