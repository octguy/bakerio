package middleware

import (
	"context"

	"github.com/google/uuid"
)

type ctxKey int

const (
	userIDKey ctxKey = iota
	branchIDKey
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

// CallerBranchID extracts the branch ID from the context.
// Returns uuid.Nil and false if not present (e.g. for HQ staff).
func CallerBranchID(ctx context.Context) (uuid.UUID, bool) {
	id, ok := ctx.Value(branchIDKey).(uuid.UUID)
	if !ok {
		return uuid.Nil, false
	}
	return id, ok
}

// WithCaller injects the user ID and optional branch ID into a new context.
func WithCaller(ctx context.Context, userID uuid.UUID, branchID *uuid.UUID) context.Context {
	ctx = context.WithValue(ctx, userIDKey, userID)
	if branchID != nil {
		ctx = context.WithValue(ctx, branchIDKey, *branchID)
	}
	return ctx
}
