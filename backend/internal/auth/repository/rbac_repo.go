package repository

import (
	"context"

	"github.com/google/uuid"
	authdb "github.com/octguy/bakerio/backend/db/sqlc/auth"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
	"github.com/octguy/bakerio/backend/pkg/txmanager"
)

type RBACRepository interface {
	AddRole(ctx context.Context, roleName string, description *string) (*domain.Role, error)

	GetRoleById(ctx context.Context, roleID uuid.UUID) (*domain.Role, error)
	GetRoleByName(ctx context.Context, name string) (*domain.Role, error)

	GetPermissionById(ctx context.Context, permissionID uuid.UUID) (*domain.Permission, error)
	GetPermissionByName(ctx context.Context, name string) (*domain.Permission, error)
	GetPermissionsByUser(ctx context.Context, userID uuid.UUID) ([]*domain.Permission, error)
	GetPermissionIdsByRoleId(ctx context.Context, roleID uuid.UUID) ([]uuid.UUID, error)
	GetAllPermissions(ctx context.Context) ([]*domain.Permission, error)

	AddPermissionsForRole(ctx context.Context, roleID uuid.UUID, permissions []uuid.UUID) error
	RemovePermissionsForRole(ctx context.Context, roleID uuid.UUID, permissions []uuid.UUID) error

	GetUserRoles(ctx context.Context, userID uuid.UUID) ([]string, error)
	GetPermissionsByRole(ctx context.Context, roleName string) ([]string, error)
	GetAllRoles(ctx context.Context) ([]*domain.Role, error)
	AssignRole(ctx context.Context, userID uuid.UUID, roleName string) error
	RemoveRole(ctx context.Context, userID uuid.UUID, roleName string) error
}

type rbacRepo struct {
	db *authdb.Queries
}

func (r *rbacRepo) GetPermissionIdsByRoleId(ctx context.Context, roleID uuid.UUID) ([]uuid.UUID, error) {
	rows, err := r.queries(ctx).GetPermissionIdsByRoleId(ctx, roleID)
	if err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *rbacRepo) GetAllPermissions(ctx context.Context) ([]*domain.Permission, error) {
	rows, err := r.queries(ctx).GetAllPermissions(ctx)
	if err != nil {
		return nil, err
	}
	perms := make([]*domain.Permission, 0)
	for _, row := range rows {
		perms = append(perms, &domain.Permission{
			ID:   row.ID,
			Name: row.Name,
		})
	}

	return perms, nil
}

func (r *rbacRepo) AddPermissionsForRole(ctx context.Context, roleID uuid.UUID, permissions []uuid.UUID) error {
	q := r.queries(ctx)

	return q.AddPermissionsToRole(ctx, authdb.AddPermissionsToRoleParams{
		RoleID:        roleID,
		PermissionIds: permissions,
	})
}

func (r *rbacRepo) RemovePermissionsForRole(ctx context.Context, roleID uuid.UUID, permissions []uuid.UUID) error {
	q := r.queries(ctx)
	return q.RemovePermissionsFromRole(ctx, authdb.RemovePermissionsFromRoleParams{
		RoleID:        roleID,
		PermissionIds: permissions,
	})
}

func (r *rbacRepo) GetRoleByName(ctx context.Context, name string) (*domain.Role, error) {
	q := r.queries(ctx)

	row, err := q.GetRoleByName(ctx, name)
	if err != nil {
		return nil, err
	}

	return &domain.Role{
		ID:          row.ID,
		Name:        row.Name,
		Description: row.Description,
	}, nil
}

func (r *rbacRepo) GetPermissionByName(ctx context.Context, name string) (*domain.Permission, error) {
	q := r.queries(ctx)
	row, err := q.GetPermissionByName(ctx, name)
	if err != nil {
		return nil, err
	}
	return &domain.Permission{
		ID:   row.ID,
		Name: row.Name,
	}, nil
}

func (r *rbacRepo) GetPermissionsByUser(ctx context.Context, userID uuid.UUID) ([]*domain.Permission, error) {
	q := r.queries(ctx)

	rows, err := q.GetPermissionsByUserId(ctx, userID)
	if err != nil {
		return nil, err
	}

	permissions := make([]*domain.Permission, len(rows))
	for i, row := range rows {
		permissions[i] = &domain.Permission{
			ID:   row.ID,
			Name: row.Name,
		}
	}

	return permissions, nil
}

func (r *rbacRepo) GetRoleById(ctx context.Context, roleID uuid.UUID) (*domain.Role, error) {
	q := r.queries(ctx)
	row, err := q.GetRoleById(ctx, roleID)
	if err != nil {
		return nil, err
	}
	return &domain.Role{
		ID:   row.ID,
		Name: row.Name,
	}, nil
}

func (r *rbacRepo) GetPermissionById(ctx context.Context, permissionID uuid.UUID) (*domain.Permission, error) {
	q := r.queries(ctx)
	row, err := q.GetPermissionById(ctx, permissionID)
	if err != nil {
		return nil, err
	}

	return &domain.Permission{
		ID:   row.ID,
		Name: row.Name,
	}, nil
}

func (r *rbacRepo) AddRole(ctx context.Context, roleName string, description *string) (*domain.Role, error) {
	q := r.queries(ctx)

	row, err := q.CreateRole(ctx, authdb.CreateRoleParams{
		Name:        roleName,
		Description: description,
	})

	if err != nil {
		return nil, err
	}

	return &domain.Role{
		ID:          row.ID,
		Name:        row.Name,
		Description: row.Description,
	}, nil
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

func (r *rbacRepo) GetAllRoles(ctx context.Context) ([]*domain.Role, error) {
	rows, err := r.queries(ctx).GetAllRoles(ctx)
	if err != nil {
		return nil, apperrors.Internal("failed to get all roles", err)
	}

	roles := make([]*domain.Role, 0)
	for _, row := range rows {
		roles = append(roles, &domain.Role{
			ID:          row.ID,
			Name:        row.Name,
			Description: row.Description,
		})
	}

	return roles, nil
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

func NewRBACRepo(db *authdb.Queries) RBACRepository {
	return &rbacRepo{db: db}
}
