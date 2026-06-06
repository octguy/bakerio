package dto

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"

	"github.com/octguy/bakerio/backend/pkg/pagination"
)

type NotificationResponse struct {
	ID        uuid.UUID       `json:"id"`
	Type      string          `json:"type"`
	Title     string          `json:"title"`
	Body      string          `json:"body"`
	Data      json.RawMessage `json:"data"`
	ReadAt    *time.Time      `json:"read_at,omitempty"`
	CreatedAt time.Time       `json:"created_at"`
} // @name NotificationResponse

type NotificationListResponse struct {
	Items []NotificationResponse `json:"items"`
	pagination.Meta
} // @name NotificationListResponse

type UnreadCountResponse struct {
	Count int64 `json:"count"`
} // @name UnreadCountResponse

type MarkReadAllResponse struct {
	Updated int64 `json:"updated"`
} // @name MarkReadAllResponse
