package service

import (
	"context"
	"slices"

	"github.com/google/uuid"
	authSvc "github.com/octguy/bakerio/backend/internal/auth/service"
	branchSvc "github.com/octguy/bakerio/backend/internal/branch/service"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
	"github.com/octguy/bakerio/backend/internal/shared/authcontext"
	"github.com/octguy/bakerio/backend/internal/user/dto"
)

// allowedRolesByPermission defines which roles each permission level may assign.
var allowedRolesByPermission = map[string][]string{
	"user:manage:all":    {"branch_manager", "branch_staff", "product_manager"},
	"user:manage:branch": {"branch_staff"},
}

// branchScopedRoles mirrors auth.BranchScopedRoles — the user module decides
// whether a branch_id is required and writes the membership row.
var branchScopedRoles = map[string]bool{
	"branch_manager": true,
	"branch_staff":   true,
}

type UserService interface {
	CreateUser(ctx context.Context, req dto.CreateUserRequest, callerPerms []string) (dto.CreateUserResponse, error)
	GetUserProfile(ctx context.Context, targetID uuid.UUID) (dto.ProfileResponse, error)
	UpdateUserProfile(ctx context.Context, targetID uuid.UUID, req dto.UpdateProfileRequest) (dto.ProfileResponse, error)
	AdminSetPassword(ctx context.Context, targetID uuid.UUID, newPassword string) error
}

type userService struct {
	profileSvc    ProfileService
	authSvc       authSvc.AuthService
	membershipSvc branchSvc.MembershipService
}

func NewUserService(profileSvc ProfileService, authSvc authSvc.AuthService, membershipSvc branchSvc.MembershipService) UserService {
	return &userService{profileSvc: profileSvc, authSvc: authSvc, membershipSvc: membershipSvc}
}

func (s *userService) CreateUser(ctx context.Context, req dto.CreateUserRequest, callerPerms []string) (dto.CreateUserResponse, error) {
	allowed := resolveAllowedRoles(callerPerms)
	if !slices.Contains(allowed, req.Role) {
		return dto.CreateUserResponse{}, apperrors.Forbidden("you are not allowed to assign role: " + req.Role)
	}

	// Branch-scoped roles must carry a branch_id; non-branch roles must not.
	if branchScopedRoles[req.Role] {
		if req.BranchID == nil || *req.BranchID == uuid.Nil {
			return dto.CreateUserResponse{}, apperrors.Validation("branch_id is required for role: " + req.Role)
		}
	} else {
		req.BranchID = nil
	}

	// Branch-manager callers can only create staff for their own branch.
	if !slices.Contains(callerPerms, "user:manage:all") && !slices.Contains(callerPerms, "*:*:all") && slices.Contains(callerPerms, "user:manage:branch") {
		callerID, ok := authcontext.CallerID(ctx)
		if !ok {
			return dto.CreateUserResponse{}, apperrors.Forbidden("caller identity missing")
		}
		callerBranch, err := s.membershipSvc.Get(ctx, callerID)
		if err != nil {
			return dto.CreateUserResponse{}, err
		}
		if callerBranch == nil {
			return dto.CreateUserResponse{}, apperrors.Forbidden("you must belong to a branch to create staff")
		}
		if req.BranchID == nil || *req.BranchID != *callerBranch {
			return dto.CreateUserResponse{}, apperrors.Forbidden("you can only create staff for your own branch")
		}
	}

	user, err := s.authSvc.CreateStaff(ctx, req.Email, req.FullName, req.Password, req.Role)
	if err != nil {
		return dto.CreateUserResponse{}, err
	}

	// If the role is branch-scoped, write the membership row.
	if req.BranchID != nil {
		if err := s.membershipSvc.Set(ctx, user.ID, *req.BranchID); err != nil {
			return dto.CreateUserResponse{}, err
		}
	}

	return dto.CreateUserResponse{
		ID:        user.ID,
		Email:     user.Email,
		FullName:  user.FullName,
		Role:      req.Role,
		BranchID:  req.BranchID,
		CreatedAt: user.CreatedAt,
	}, nil
}

func (s *userService) GetUserProfile(ctx context.Context, targetID uuid.UUID) (dto.ProfileResponse, error) {
	prof, err := s.profileSvc.GetProfile(ctx, targetID)
	if err != nil {
		return dto.ProfileResponse{}, apperrors.NotFound("user profile not found")
	}
	return prof, nil
}

func (s *userService) UpdateUserProfile(ctx context.Context, targetID uuid.UUID, req dto.UpdateProfileRequest) (dto.ProfileResponse, error) {
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
