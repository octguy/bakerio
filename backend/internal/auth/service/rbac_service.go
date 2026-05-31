package service

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/octguy/bakerio/backend/internal/auth/repository"
	"github.com/octguy/bakerio/backend/internal/platform/cache"
	"github.com/octguy/bakerio/backend/internal/platform/logger"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
	"github.com/octguy/bakerio/backend/pkg/txmanager"
	"github.com/octguy/bakerio/backend/pkg/utils"
	"go.uber.org/zap"
)

const (
	permCachePrefix = "rbac:permissions:"
	permCacheTTL    = time.Hour
)

type RBACService interface {
	GetUserRoles(ctx context.Context, userID uuid.UUID) ([]string, error)
	AssignMemberRole(ctx context.Context, userID uuid.UUID) error
	ResolvePermissions(ctx context.Context, roles []string) ([]string, error)
	WarmPermissionCache(ctx context.Context) error
	AssignRole(ctx context.Context, userID uuid.UUID, roleName string) error
	RemoveRole(ctx context.Context, userID uuid.UUID, roleName string) error

	// Role + permission management (admin).
	CreateRole(ctx context.Context, name string, description *string) (*domain.Role, error)
	UpdateRole(ctx context.Context, roleID uuid.UUID, name string, description *string) (*domain.Role, error)
	UpdatePermissionsForRole(ctx context.Context, roleID uuid.UUID, permissionIds []uuid.UUID) error

	GetAllRoles(ctx context.Context) ([]*domain.Role, error)
	GetRoleByID(ctx context.Context, roleID uuid.UUID) (*domain.Role, error)
	GetAllPermissions(ctx context.Context) ([]*domain.Permission, error)
	GetPermissionByID(ctx context.Context, permissionID uuid.UUID) (*domain.Permission, error)
	GetPermissionsByRoleID(ctx context.Context, roleID uuid.UUID) ([]*domain.Permission, error)
}

type rbacService struct {
	repo  repository.RBACRepository
	redis *cache.Client
	tx    *txmanager.TxManager
}

func (s *rbacService) GetAllRoles(ctx context.Context) ([]*domain.Role, error) {
	roleNames, err := s.repo.GetAllRoles(ctx)
	if err != nil {
		return nil, err
	}
	return roleNames, nil
}

func (s *rbacService) UpdatePermissionsForRole(ctx context.Context, roleID uuid.UUID, permissionIds []uuid.UUID) error {
	role, permIDs, err := s.resolveRoleAndPermissions(ctx, roleID, permissionIds)
	if err != nil {
		return err
	}

	currentPerms, err := s.repo.GetPermissionIdsByRoleId(ctx, role.ID)
	if err != nil {
		logger.Log.Error("rbac: failed to read current permissions",
			zap.String("role_id", role.ID.String()), zap.Error(err))
		return apperrors.Internal("failed to get current permissions", err)
	}

	toAdd := utils.Difference(permIDs, currentPerms)
	toRemove := utils.Difference(currentPerms, permIDs)

	if len(toAdd) == 0 && len(toRemove) == 0 {
		logger.Log.Info("rbac: role permissions unchanged",
			zap.String("role", role.Name), zap.String("role_id", role.ID.String()))
		return nil
	}

	err = s.tx.WithTx(ctx, func(txCtx context.Context) error {
		if err := s.repo.AddPermissionsForRole(txCtx, role.ID, toAdd); err != nil {
			logger.Log.Error("rbac: add permissions failed",
				zap.String("role_id", role.ID.String()),
				zap.Int("count", len(toAdd)), zap.Error(err))
			return apperrors.Internal("failed to add permissions", err)
		}

		if err := s.repo.RemovePermissionsForRole(txCtx, role.ID, toRemove); err != nil {
			logger.Log.Error("rbac: remove permissions failed",
				zap.String("role_id", role.ID.String()),
				zap.Int("count", len(toRemove)), zap.Error(err))
			return apperrors.Internal("failed to remove permissions", err)
		}

		s.invalidateRoleCache(ctx, roleID)
		return nil
	})
	if err != nil {
		return err
	}
	logger.Log.Info("rbac: role permissions updated",
		zap.String("role", role.Name),
		zap.String("role_id", role.ID.String()),
		zap.Int("added", len(toAdd)),
		zap.Int("removed", len(toRemove)))
	return nil
}

func NewRBACService(repo repository.RBACRepository, redis *cache.Client, tx *txmanager.TxManager) RBACService {
	return &rbacService{repo: repo, redis: redis, tx: tx}
}

func (s *rbacService) GetUserRoles(ctx context.Context, userID uuid.UUID) ([]string, error) {
	return s.repo.GetUserRoles(ctx, userID)
}

func (s *rbacService) AssignMemberRole(ctx context.Context, userID uuid.UUID) error {
	return s.repo.AssignRole(ctx, userID, "customer")
}

func (s *rbacService) ResolvePermissions(ctx context.Context, roles []string) ([]string, error) {
	seen := make(map[string]struct{}) // hash set
	var result []string

	for _, role := range roles {
		perms, err := s.permissionsForRole(ctx, role)
		if err != nil {
			return nil, err
		}
		for _, p := range perms {
			if _, ok := seen[p]; !ok {
				seen[p] = struct{}{}
				result = append(result, p)
			}
		}
	}

	return result, nil
}

func (s *rbacService) permissionsForRole(ctx context.Context, role string) ([]string, error) {
	key := permCachePrefix + role

	cached, err := s.redis.Get(ctx, key)
	if err == nil {
		var perms []string
		if jsonErr := json.Unmarshal([]byte(cached), &perms); jsonErr == nil {
			return perms, nil
		}
	}

	perms, err := s.repo.GetPermissionsByRole(ctx, role)
	if err != nil {
		return nil, err
	}

	if data, jsonErr := json.Marshal(perms); jsonErr == nil {
		_ = s.redis.Set(ctx, key, string(data), permCacheTTL)
	}

	return perms, nil
}

func (s *rbacService) WarmPermissionCache(ctx context.Context) error {
	roles, err := s.repo.GetAllRoles(ctx)
	if err != nil {
		return err
	}

	for _, role := range roles {
		perms, err := s.repo.GetPermissionsByRole(ctx, role.Name)
		if err != nil {
			logger.Log.Warn("rbac: failed to load permissions for role", zap.String("role", role.Name), zap.Error(err))
			continue
		}

		data, err := json.Marshal(perms)
		if err != nil {
			continue
		}

		if err := s.redis.Set(ctx, permCachePrefix+role.Name, string(data), permCacheTTL); err != nil {
			logger.Log.Warn("rbac: failed to cache permissions for role", zap.String("role", role.Name), zap.Error(err))
		}
	}

	logger.Log.Info("rbac: permission cache warmed", zap.Int("roles", len(roles)))
	return nil
}

func (s *rbacService) AssignRole(ctx context.Context, userID uuid.UUID, roleName string) error {
	if err := s.repo.AssignRole(ctx, userID, roleName); err != nil {
		logger.Log.Error("rbac: assign role failed",
			zap.String("user_id", userID.String()), zap.String("role", roleName), zap.Error(err))
		return err
	}
	logger.Log.Info("rbac: role assigned",
		zap.String("user_id", userID.String()), zap.String("role", roleName))
	return nil
}

func (s *rbacService) RemoveRole(ctx context.Context, userID uuid.UUID, roleName string) error {
	if err := s.repo.RemoveRole(ctx, userID, roleName); err != nil {
		logger.Log.Error("rbac: remove role failed",
			zap.String("user_id", userID.String()), zap.String("role", roleName), zap.Error(err))
		return err
	}
	_ = s.redis.Del(ctx, permCachePrefix+roleName)
	logger.Log.Info("rbac: role removed",
		zap.String("user_id", userID.String()), zap.String("role", roleName))
	return nil
}

// CreateRole creates a new role. Returns Conflict if the name is already taken.
func (s *rbacService) CreateRole(ctx context.Context, name string, description *string) (*domain.Role, error) {
	// Cheap pre-check for a clean 409; the UNIQUE constraint is the real guard.
	existing, err := s.repo.GetRoleByName(ctx, name)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, apperrors.Internal("database error", err)
	}
	if existing != nil {
		return nil, apperrors.Conflict("role already exists")
	}

	role, err := s.repo.AddRole(ctx, name, description)
	if err != nil {
		logger.Log.Error("rbac: create role failed", zap.String("name", name), zap.Error(err))
		return nil, apperrors.Internal("failed to create role", err)
	}
	logger.Log.Info("rbac: role created",
		zap.String("role_id", role.ID.String()), zap.String("name", role.Name))
	return role, nil
}

//// AddPermissionsToRole grants a set of permissions to a role (idempotent at the
//// DB level via ON CONFLICT DO NOTHING).
//func (s *rbacService) AddPermissionsToRole(ctx context.Context, roleName string, permissionNames []string) error {
//	role, permIDs, err := s.resolveRoleAndPermissions(ctx, roleName, permissionNames)
//	if err != nil {
//		return err
//	}
//	if err := s.repo.AddPermissionsForRole(ctx, role.ID, permIDs); err != nil {
//		return apperrors.Internal("failed to add permissions", err)
//	}
//	s.invalidateRoleCache(ctx, roleName)
//	return nil
//}
//
//// RemovePermissionsFromRole revokes a set of permissions from a role (no-op for
//// any that the role doesn't currently have).
//func (s *rbacService) RemovePermissionsFromRole(ctx context.Context, roleName string, permissionNames []string) error {
//	role, permIDs, err := s.resolveRoleAndPermissions(ctx, roleName, permissionNames)
//	if err != nil {
//		return err
//	}
//	if err := s.repo.RemovePermissionsForRole(ctx, role.ID, permIDs); err != nil {
//		return apperrors.Internal("failed to remove permissions", err)
//	}
//	s.invalidateRoleCache(ctx, roleName)
//	return nil
//}

// resolveRoleAndPermissions looks up the role by id (404 if missing) and
// every permission by id (404 if any are missing), return successfully only if all exist.
// Returns the role and the list of permission IDs (which may be empty if no permissions were requested).
func (s *rbacService) resolveRoleAndPermissions(ctx context.Context, roleId uuid.UUID, permissionIds []uuid.UUID) (*domain.Role, []uuid.UUID, error) {
	role, err := s.repo.GetRoleById(ctx, roleId)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil, apperrors.NotFound("role not found with id: " + roleId.String())
		}
		return nil, nil, apperrors.Internal("database error", err)
	}

	if len(permissionIds) == 0 {
		return role, nil, nil
	}

	for _, permId := range permissionIds {
		_, err := s.repo.GetPermissionById(ctx, permId)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, nil, apperrors.NotFound("permission not found with id: " + permId.String())
			}
			return nil, nil, apperrors.Internal("database error", err)
		}
	}
	return role, permissionIds, nil
}

// invalidateRoleCache drops the cached permission list for the role so the next
// resolve call rebuilds it from the DB.
func (s *rbacService) invalidateRoleCache(ctx context.Context, roleId uuid.UUID) {
	role, err := s.repo.GetRoleById(ctx, roleId)
	if err != nil {
		logger.Log.Warn("rbac: failed to invalidate role", zap.String("role", roleId.String()))
		return
	}

	if err := s.redis.Del(ctx, permCachePrefix+role.Name); err != nil {
		logger.Log.Warn("rbac: failed to invalidate role cache",
			zap.String("role", role.Name), zap.Error(err))
	}
}

// UpdateRole renames / re-describes a role by ID. Returns Conflict if the new
// name is already used by another role; NotFound if the role doesn't exist.
func (s *rbacService) UpdateRole(ctx context.Context, roleID uuid.UUID, name string, description *string) (*domain.Role, error) {
	current, err := s.repo.GetRoleById(ctx, roleID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperrors.NotFound("role not found")
		}
		return nil, apperrors.Internal("database error", err)
	}

	// If the name is changing, make sure no other role uses it.
	if name != current.Name {
		other, err := s.repo.GetRoleByName(ctx, name)
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return nil, apperrors.Internal("database error", err)
		}
		if other != nil {
			return nil, apperrors.Conflict("role name already in use")
		}
	}

	updated, err := s.repo.UpdateRole(ctx, roleID, name, description)
	if err != nil {
		logger.Log.Error("rbac: update role failed",
			zap.String("role_id", roleID.String()), zap.Error(err))
		return nil, apperrors.Internal("failed to update role", err)
	}

	// If the name actually changed, the cache key was keyed by the *old* name.
	if updated.Name != current.Name {
		if err := s.redis.Del(ctx, permCachePrefix+current.Name); err != nil {
			logger.Log.Warn("rbac: failed to invalidate old role cache",
				zap.String("role", current.Name), zap.Error(err))
		}
	}
	logger.Log.Info("rbac: role updated",
		zap.String("role_id", updated.ID.String()),
		zap.String("old_name", current.Name),
		zap.String("new_name", updated.Name))
	return updated, nil
}

func (s *rbacService) GetRoleByID(ctx context.Context, roleID uuid.UUID) (*domain.Role, error) {
	role, err := s.repo.GetRoleById(ctx, roleID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperrors.NotFound("role not found")
		}
		return nil, apperrors.Internal("database error", err)
	}
	return role, nil
}

func (s *rbacService) GetAllPermissions(ctx context.Context) ([]*domain.Permission, error) {
	perms, err := s.repo.GetAllPermissions(ctx)
	if err != nil {
		return nil, apperrors.Internal("failed to list permissions", err)
	}
	return perms, nil
}

func (s *rbacService) GetPermissionByID(ctx context.Context, permissionID uuid.UUID) (*domain.Permission, error) {
	perm, err := s.repo.GetPermissionById(ctx, permissionID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperrors.NotFound("permission not found")
		}
		return nil, apperrors.Internal("database error", err)
	}
	return perm, nil
}

func (s *rbacService) GetPermissionsByRoleID(ctx context.Context, roleID uuid.UUID) ([]*domain.Permission, error) {
	// 404 if the role doesn't exist, rather than silently returning an empty list.
	if _, err := s.repo.GetRoleById(ctx, roleID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperrors.NotFound("role not found")
		}
		return nil, apperrors.Internal("database error", err)
	}
	perms, err := s.repo.GetPermissionsByRoleId(ctx, roleID)
	if err != nil {
		return nil, apperrors.Internal("failed to list role permissions", err)
	}
	return perms, nil
}
