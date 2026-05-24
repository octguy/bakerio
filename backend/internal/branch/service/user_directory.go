package service

import (
	"context"

	"github.com/google/uuid"
)

// UserInfo is the user data the branch module needs to enrich member responses
// but does not own. It is composed from the user + auth modules via an adapter
// wired in main.
type UserInfo struct {
	UserID      uuid.UUID
	DisplayName string
	Email       string
	Roles       []string
}

// UserDirectory is a port the branch module consumes to look up user details
// for members. The implementation lives in main (adapter over user + auth).
type UserDirectory interface {
	GetUsersInfo(ctx context.Context, ids []uuid.UUID) ([]UserInfo, error)
}
