package service

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/octguy/bakerio/backend/internal/auth/repository"
	"github.com/octguy/bakerio/backend/internal/platform/cache"
	"github.com/octguy/bakerio/backend/internal/platform/logger"
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
}

type rbacService struct {
	repo  repository.RBACRepository
	redis *cache.Client
}

func NewRBACService(repo repository.RBACRepository, redis *cache.Client) RBACService {
	return &rbacService{repo: repo, redis: redis}
}

func (s *rbacService) GetUserRoles(ctx context.Context, userID uuid.UUID) ([]string, error) {
	return s.repo.GetUserRoles(ctx, userID)
}

func (s *rbacService) AssignMemberRole(ctx context.Context, userID uuid.UUID) error {
	return s.repo.AssignRole(ctx, userID, "member")
}

func (s *rbacService) ResolvePermissions(ctx context.Context, roles []string) ([]string, error) {
	seen := make(map[string]struct{})
	result := []string{}

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
		perms, err := s.repo.GetPermissionsByRole(ctx, role)
		if err != nil {
			logger.Log.Warn("rbac: failed to load permissions for role", zap.String("role", role), zap.Error(err))
			continue
		}

		data, err := json.Marshal(perms)
		if err != nil {
			continue
		}

		if err := s.redis.Set(ctx, permCachePrefix+role, string(data), permCacheTTL); err != nil {
			logger.Log.Warn("rbac: failed to cache permissions for role", zap.String("role", role), zap.Error(err))
		}
	}

	logger.Log.Info("rbac: permission cache warmed", zap.Int("roles", len(roles)))
	return nil
}

func (s *rbacService) AssignRole(ctx context.Context, userID uuid.UUID, roleName string) error {
	if err := s.repo.AssignRole(ctx, userID, roleName); err != nil {
		return err
	}
	_ = s.redis.Del(ctx, permCachePrefix+roleName)
	return nil
}

func (s *rbacService) RemoveRole(ctx context.Context, userID uuid.UUID, roleName string) error {
	if err := s.repo.RemoveRole(ctx, userID, roleName); err != nil {
		return err
	}
	_ = s.redis.Del(ctx, permCachePrefix+roleName)
	return nil
}
