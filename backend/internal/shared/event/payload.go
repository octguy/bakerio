package event

import "github.com/google/uuid"

type UserRegisteredPayload struct {
	UserID      uuid.UUID `json:"user_id"`
	Email       string    `json:"email"`
	DisplayName string    `json:"display_name"`
}
