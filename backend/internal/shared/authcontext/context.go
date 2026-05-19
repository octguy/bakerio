package authcontext

import (
	"context"

	"github.com/google/uuid"
)

type ctxKey int

const (
	userIDKey ctxKey = iota
)

// CallerID extracts the user ID from the context.
// Returns uuid.Nil and false if not present.
func CallerID(ctx context.Context) (uuid.UUID, bool) {
	id, ok := ctx.Value(userIDKey).(uuid.UUID)
	if !ok {
		return uuid.Nil, false
	}
	return id, ok
}

// WithCaller injects the user ID into a new context.
// Branch ownership is no longer carried in context — resolve from
// branch.MembershipService at the point of use.
func WithCaller(ctx context.Context, userID uuid.UUID) context.Context {
	return context.WithValue(ctx, userIDKey, userID)
}
