package domain

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// UserNotification is one bell-icon row. Data is preserved as raw JSON so
// each event-type can carry its own payload shape without forcing a schema
// here (and so the repo doesn't have to know about each event's fields).
type UserNotification struct {
	ID        uuid.UUID
	UserID    uuid.UUID
	Type      string
	Title     string
	Body      string
	Data      json.RawMessage // never nil; consumer writes '{}' for events without payload
	ReadAt    *time.Time
	CreatedAt time.Time
}

// IsUnread is the same predicate the partial unread index uses.
func (n UserNotification) IsUnread() bool { return n.ReadAt == nil }
