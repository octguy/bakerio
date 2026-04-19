package service

import (
	"context"
	"slices"

	"github.com/google/uuid"
	authSvc "github.com/octguy/bakerio/backend/internal/auth/service"
	profileDto "github.com/octguy/bakerio/backend/internal/profile/dto"
	profileSvc "github.com/octguy/bakerio/backend/internal/profile/service"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
	"github.com/octguy/bakerio/backend/internal/user/dto"
)

// allowedRolesByPermission defines which roles each permission level may assign.
var allowedRolesByPermission = map[string][]string{
	"user:manage:all":    {"store_manager", "staff_cashier", "baker", "shipper"},
	"user:manage:branch": {"staff_cashier", "baker", "shipper"},
}

type UserService interface {
	CreateUser(ctx context.Context, req dto.CreateUserRequest, callerPerms []string) (dto.CreateUserResponse, error)
	GetUserProfile(ctx context.Context, targetID uuid.UUID) (profileDto.ProfileResponse, error)
	UpdateUserProfile(ctx context.Context, targetID uuid.UUID, req profileDto.UpdateProfileRequest) (profileDto.ProfileResponse, error)
	AdminSetPassword(ctx context.Context, targetID uuid.UUID, newPassword string) error
}

type userService struct {
	profileSvc profileSvc.ProfileService
	authSvc    authSvc.AuthService
}

func NewUserService(profileSvc profileSvc.ProfileService, authSvc authSvc.AuthService) UserService {
	return &userService{profileSvc: profileSvc, authSvc: authSvc}
}

func (s *userService) CreateUser(ctx context.Context, req dto.CreateUserRequest, callerPerms []string) (dto.CreateUserResponse, error) {
	// Determine the broadest permission the caller holds and validate the target role.
	allowed := resolveAllowedRoles(callerPerms)
	if !slices.Contains(allowed, req.Role) {
		return dto.CreateUserResponse{}, apperrors.Forbidden("you are not allowed to assign role: " + req.Role)
	}

	user, err := s.authSvc.CreateStaff(ctx, req.Email, req.FullName, req.Password, req.Role)
	if err != nil {
		return dto.CreateUserResponse{}, err
	}

	return dto.CreateUserResponse{
		ID:        user.ID,
		Email:     user.Email,
		FullName:  user.FullName,
		Role:      req.Role,
		CreatedAt: user.CreatedAt,
	}, nil
}

func (s *userService) GetUserProfile(ctx context.Context, targetID uuid.UUID) (profileDto.ProfileResponse, error) {
	prof, err := s.profileSvc.GetProfile(ctx, targetID)
	if err != nil {
		return profileDto.ProfileResponse{}, apperrors.NotFound("user profile not found")
	}
	return prof, nil
}

func (s *userService) UpdateUserProfile(ctx context.Context, targetID uuid.UUID, req profileDto.UpdateProfileRequest) (profileDto.ProfileResponse, error) {
	return s.profileSvc.UpdateProfile(ctx, targetID, req)
}

func (s *userService) AdminSetPassword(ctx context.Context, targetID uuid.UUID, newPassword string) error {
	return s.authSvc.AdminSetPassword(ctx, targetID, newPassword)
}

// resolveAllowedRoles returns the union of assignable roles based on the caller's permissions.
// Wildcard (*:*:all) grants the broadest set.
func resolveAllowedRoles(callerPerms []string) []string {
	seen := map[string]struct{}{}
	for _, p := range callerPerms {
		if p == "*:*:all" {
			return allowedRolesByPermission["user:manage:all"]
		}
		for _, role := range allowedRolesByPermission[p] {
			seen[role] = struct{}{}
		}
	}
	result := make([]string, 0, len(seen))
	for r := range seen {
		result = append(result, r)
	}
	return result
}
