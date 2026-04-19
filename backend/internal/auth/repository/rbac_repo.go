package repository

import (
	"context"

	"github.com/google/uuid"
	authdb "github.com/octguy/bakerio/backend/db/sqlc/auth"
	"github.com/octguy/bakerio/backend/pkg/txmanager"
)

type RBACRepository interface {
	GetUserRoles(ctx context.Context, userID uuid.UUID) ([]string, error)
	GetPermissionsByRole(ctx context.Context, roleName string) ([]string, error)
	GetAllRoles(ctx context.Context) ([]string, error)
	AssignRole(ctx context.Context, userID uuid.UUID, roleName string) error
	RemoveRole(ctx context.Context, userID uuid.UUID, roleName string) error
}

type rbacRepo struct {
	db *authdb.Queries
}

func NewRBACRepo(db *authdb.Queries) RBACRepository {
	return &rbacRepo{db: db}
}

func (r *rbacRepo) queries(ctx context.Context) *authdb.Queries {
	if tx, ok := txmanager.Extract(ctx); ok {
		return r.db.WithTx(tx)
	}
	return r.db
}

func (r *rbacRepo) GetUserRoles(ctx context.Context, userID uuid.UUID) ([]string, error) {
	return r.queries(ctx).GetUserRoles(ctx, userID)
}

func (r *rbacRepo) GetPermissionsByRole(ctx context.Context, roleName string) ([]string, error) {
	return r.queries(ctx).GetPermissionsByRole(ctx, roleName)
}

func (r *rbacRepo) GetAllRoles(ctx context.Context) ([]string, error) {
	return r.queries(ctx).GetAllRoles(ctx)
}

func (r *rbacRepo) AssignRole(ctx context.Context, userID uuid.UUID, roleName string) error {
	return r.queries(ctx).AssignRoleByName(ctx, authdb.AssignRoleByNameParams{
		UserID: userID,
		Name:   roleName,
	})
}

func (r *rbacRepo) RemoveRole(ctx context.Context, userID uuid.UUID, roleName string) error {
	return r.queries(ctx).RemoveRoleByName(ctx, authdb.RemoveRoleByNameParams{
		UserID: userID,
		Name:   roleName,
	})
}
