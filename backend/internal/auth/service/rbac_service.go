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

	// CreateRole Role + permission management (admin).
	CreateRole(ctx context.Context, name string, description *string) (*domain.Role, error)
	// UpdatePermissionsForRole AddPermissionsToRole(ctx context.Context, roleName string, permissionNames []string) error
	// RemovePermissionsFromRole (ctx context.Context, roleName string, permissionNames []string) error
	UpdatePermissionsForRole(ctx context.Context, roleName string, permissionNames []string) error
	GetAllRoles(ctx context.Context) ([]*domain.Role, error)
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

func (s *rbacService) UpdatePermissionsForRole(ctx context.Context, roleName string, permissionNames []string) error {
	role, permIDs, err := s.resolveRoleAndPermissions(ctx, roleName, permissionNames)
	if err != nil {
		return err
	}

	currentPerms, err := s.repo.GetPermissionIdsByRoleId(ctx, role.ID)
	if err != nil {
		return apperrors.Internal("failed to get current permissions", err)
	}

	toAdd := utils.Difference(permIDs, currentPerms)
	toRemove := utils.Difference(currentPerms, permIDs)

	err = s.tx.WithTx(ctx, func(txCtx context.Context) error {
		err = s.repo.AddPermissionsForRole(txCtx, role.ID, toAdd)
		if err != nil {
			return apperrors.Internal("failed to add permissions", err)
		}

		err = s.repo.RemovePermissionsForRole(txCtx, role.ID, toRemove)
		if err != nil {
			return apperrors.Internal("failed to remove permissions", err)
		}

		s.invalidateRoleCache(ctx, roleName)
		return nil
	})
	return err
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
		return err
	}
	return nil
}

func (s *rbacService) RemoveRole(ctx context.Context, userID uuid.UUID, roleName string) error {
	if err := s.repo.RemoveRole(ctx, userID, roleName); err != nil {
		return err
	}
	_ = s.redis.Del(ctx, permCachePrefix+roleName)
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
		return nil, apperrors.Internal("failed to create role", err)
	}
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

// resolveRoleAndPermissions looks up the role by name (404 if missing) and
// every permission by name (404 if any are missing), returning their UUIDs.
func (s *rbacService) resolveRoleAndPermissions(ctx context.Context, roleName string, permissionNames []string) (*domain.Role, []uuid.UUID, error) {
	role, err := s.repo.GetRoleByName(ctx, roleName)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil, apperrors.NotFound("role not found: " + roleName)
		}
		return nil, nil, apperrors.Internal("database error", err)
	}

	if len(permissionNames) == 0 {
		return role, nil, nil
	}

	ids := make([]uuid.UUID, 0, len(permissionNames))
	for _, name := range permissionNames {
		p, err := s.repo.GetPermissionByName(ctx, name)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, nil, apperrors.NotFound("permission not found: " + name)
			}
			return nil, nil, apperrors.Internal("database error", err)
		}
		ids = append(ids, p.ID)
	}
	return role, ids, nil
}

// invalidateRoleCache drops the cached permission list for the role so the next
// resolve call rebuilds it from the DB.
func (s *rbacService) invalidateRoleCache(ctx context.Context, roleName string) {
	if err := s.redis.Del(ctx, permCachePrefix+roleName); err != nil {
		logger.Log.Warn("rbac: failed to invalidate role cache",
			zap.String("role", roleName), zap.Error(err))
	}
}
