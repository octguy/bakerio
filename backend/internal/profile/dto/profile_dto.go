package dto

import "github.com/google/uuid"

type UpdateProfileRequest struct {
	FullName  string `json:"full_name" binding:"required"`
	AvatarURL string `json:"avatar_url"`
	Bio       string `json:"bio"`
}

type CreateProfileRequest struct {
	UserID    uuid.UUID `json:"user_id" binding:"required"`
	AvatarURL string    `json:"avatar_url"`
	FullName  string    `json:"full_name" binding:"required"`
	Bio       string    `json:"bio"`
}

type ProfileResponse struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"`
	AvatarURL *string   `json:"avatar_url"`
	FullName  string    `json:"full_name"`
	Bio       *string   `json:"bio"`
}
