package service

import (
	"context"
	"errors"
	"slices"

	"github.com/google/uuid"
	authSvc "github.com/octguy/bakerio/backend/internal/auth/service"
	branchSvc "github.com/octguy/bakerio/backend/internal/branch/service"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
	"github.com/octguy/bakerio/backend/internal/shared/authcontext"
	"github.com/octguy/bakerio/backend/internal/user/dto"
	"github.com/octguy/bakerio/backend/internal/user/repository"
	"github.com/octguy/bakerio/backend/pkg/pagination"
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
	GetUserProfile(ctx context.Context, callerPerms []string, targetID uuid.UUID) (dto.ProfileResponse, error)
	UpdateUserProfile(ctx context.Context, callerPerms []string, targetID uuid.UUID, req dto.UpdateProfileRequest) (dto.ProfileResponse, error)
	AdminSetPassword(ctx context.Context, callerPerms []string, targetID uuid.UUID, newPassword string) error

	// Own-profile operations. The response stays unchanged for plain customers
	// and gains role + branch for staff.
	GetOwnProfile(ctx context.Context, userID uuid.UUID) (dto.ProfileResponse, error)
	UpdateOwnProfile(ctx context.Context, userID uuid.UUID, req dto.UpdateProfileRequest) (dto.ProfileResponse, error)

	// SearchUsers powers GET /users and GET /staff. If the caller lacks
	// cross-branch privileges, the filter is silently scoped to the caller's
	// own branch — managers can only see their own staff.
	SearchUsers(ctx context.Context, callerPerms []string, filter dto.UserListFilter, p pagination.Params) (dto.UserListResponse, error)
}

type userService struct {
	profileSvc    ProfileService
	searchRepo    repository.UserSearchRepository
	authSvc       authSvc.AuthService
	rbacSvc       authSvc.RBACService
	membershipSvc branchSvc.MembershipService
	branchSvc     branchSvc.BranchService
}

func NewUserService(
	profileSvc ProfileService,
	searchRepo repository.UserSearchRepository,
	authSvc authSvc.AuthService,
	rbacSvc authSvc.RBACService,
	membershipSvc branchSvc.MembershipService,
	branchSvc branchSvc.BranchService,
) UserService {
	return &userService{
		profileSvc:    profileSvc,
		searchRepo:    searchRepo,
		authSvc:       authSvc,
		rbacSvc:       rbacSvc,
		membershipSvc: membershipSvc,
		branchSvc:     branchSvc,
	}
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
		callerMb, err := s.membershipSvc.GetMembership(ctx, callerID)
		if err != nil {
			var ae *apperrors.AppError
			if errors.As(err, &ae) && ae.Code == apperrors.CodeNotFound {
				return dto.CreateUserResponse{}, apperrors.Forbidden("you must belong to a branch to create staff")
			}
			return dto.CreateUserResponse{}, err
		}
		if req.BranchID == nil || *req.BranchID != callerMb.BranchID {
			return dto.CreateUserResponse{}, apperrors.Forbidden("you can only create staff for your own branch")
		}
	}

	user, err := s.authSvc.CreateStaff(ctx, req.Email, req.FullName, req.Password, req.Role)
	if err != nil {
		return dto.CreateUserResponse{}, err
	}

	// If the role is branch-scoped, write the membership row.
	var brief *dto.BranchBrief
	if req.BranchID != nil {
		if err := s.membershipSvc.SetMembership(ctx, user.ID, *req.BranchID); err != nil {
			return dto.CreateUserResponse{}, err
		}
		brief, err = s.branchBrief(ctx, *req.BranchID)
		if err != nil {
			return dto.CreateUserResponse{}, err
		}
	}

	return dto.CreateUserResponse{
		ID:        user.ID,
		Email:     user.Email,
		FullName:  user.FullName,
		Role:      req.Role,
		Branch:    brief,
		CreatedAt: user.CreatedAt,
	}, nil
}

func (s *userService) GetUserProfile(ctx context.Context, callerPerms []string, targetID uuid.UUID) (dto.ProfileResponse, error) {
	if err := s.ensureCanManageTarget(ctx, callerPerms, targetID); err != nil {
		return dto.ProfileResponse{}, err
	}
	prof, err := s.profileSvc.GetProfile(ctx, targetID)
	if err != nil {
		return dto.ProfileResponse{}, apperrors.NotFound("user profile not found")
	}
	// Staff-management view: always attach role + branch (when assigned).
	if err := s.enrich(ctx, &prof); err != nil {
		return dto.ProfileResponse{}, err
	}
	return prof, nil
}

func (s *userService) UpdateUserProfile(ctx context.Context, callerPerms []string, targetID uuid.UUID, req dto.UpdateProfileRequest) (dto.ProfileResponse, error) {
	if err := s.ensureCanManageTarget(ctx, callerPerms, targetID); err != nil {
		return dto.ProfileResponse{}, err
	}
	prof, err := s.profileSvc.UpdateProfile(ctx, targetID, req)
	if err != nil {
		return dto.ProfileResponse{}, err
	}
	if err := s.enrich(ctx, &prof); err != nil {
		return dto.ProfileResponse{}, err
	}
	return prof, nil
}

func (s *userService) GetOwnProfile(ctx context.Context, userID uuid.UUID) (dto.ProfileResponse, error) {
	prof, err := s.profileSvc.GetProfile(ctx, userID)
	if err != nil {
		return dto.ProfileResponse{}, apperrors.NotFound("user profile not found")
	}
	if err := s.enrichIfStaff(ctx, &prof); err != nil {
		return dto.ProfileResponse{}, err
	}
	return prof, nil
}

func (s *userService) UpdateOwnProfile(ctx context.Context, userID uuid.UUID, req dto.UpdateProfileRequest) (dto.ProfileResponse, error) {
	prof, err := s.profileSvc.UpdateProfile(ctx, userID, req)
	if err != nil {
		return dto.ProfileResponse{}, err
	}
	if err := s.enrichIfStaff(ctx, &prof); err != nil {
		return dto.ProfileResponse{}, err
	}
	return prof, nil
}

// SearchUsers powers GET /users and GET /staff. The repo runs one cross-schema
// query; the caller's permissions decide whether the filter is scoped to their
// own branch.
func (s *userService) SearchUsers(ctx context.Context, callerPerms []string, filter dto.UserListFilter, p pagination.Params) (dto.UserListResponse, error) {
	// Branch-scoped manager: override any branch_id in the filter with the
	// caller's own branch. This silently restricts the view — the manager
	// can't widen by passing a different branch_id.
	if !hasCrossBranchUserPerm(callerPerms) {
		callerID, ok := authcontext.CallerID(ctx)
		if !ok {
			return dto.UserListResponse{}, apperrors.Forbidden("caller identity missing")
		}
		mb, err := s.membershipSvc.GetMembership(ctx, callerID)
		if err != nil {
			var ae *apperrors.AppError
			if errors.As(err, &ae) && ae.Code == apperrors.CodeNotFound {
				return dto.UserListResponse{}, apperrors.Forbidden("you must belong to a branch")
			}
			return dto.UserListResponse{}, err
		}
		bid := mb.BranchID
		filter.BranchID = &bid
	}

	items, err := s.searchRepo.SearchUsers(ctx, filter, p.Size, p.Offset())
	if err != nil {
		return dto.UserListResponse{}, apperrors.Internal("failed to search users", err)
	}
	total, err := s.searchRepo.CountUsers(ctx, filter)
	if err != nil {
		return dto.UserListResponse{}, apperrors.Internal("failed to count users", err)
	}

	out := make([]dto.UserSummary, 0, len(items))
	for _, it := range items {
		out = append(out, *it)
	}
	return dto.UserListResponse{Items: out, Meta: pagination.NewMeta(p, total)}, nil
}

// hasCrossBranchUserPerm returns true if the caller can see users across any
// branch (admin / user:view:all / user:manage:all).
func hasCrossBranchUserPerm(perms []string) bool {
	for _, p := range perms {
		if slices.Contains(crossBranchUserPerms, p) {
			return true
		}
	}
	return false
}

func (s *userService) AdminSetPassword(ctx context.Context, callerPerms []string, targetID uuid.UUID, newPassword string) error {
	if err := s.ensureCanManageTarget(ctx, callerPerms, targetID); err != nil {
		return err
	}
	return s.authSvc.AdminSetPassword(ctx, targetID, newPassword)
}

// crossBranchUserPerms grant access to any user regardless of branch.
var crossBranchUserPerms = []string{"*:*:all", "user:manage:all", "user:view:all"}

// ensureCanManageTarget allows admin-level callers to act on any user, but
// restricts a branch-scoped caller (only user:manage:branch) to staff that
// belong to the caller's own branch.
func (s *userService) ensureCanManageTarget(ctx context.Context, callerPerms []string, targetID uuid.UUID) error {
	for _, p := range callerPerms {
		if slices.Contains(crossBranchUserPerms, p) {
			return nil
		}
	}

	callerID, ok := authcontext.CallerID(ctx)
	if !ok {
		return apperrors.Forbidden("caller identity missing")
	}
	callerMb, err := s.membershipSvc.GetMembership(ctx, callerID)
	if err != nil {
		var ae *apperrors.AppError
		if errors.As(err, &ae) && ae.Code == apperrors.CodeNotFound {
			return apperrors.Forbidden("you must belong to a branch")
		}
		return err
	}
	targetMb, err := s.membershipSvc.GetMembership(ctx, targetID)
	if err != nil {
		var ae *apperrors.AppError
		if errors.As(err, &ae) && ae.Code == apperrors.CodeNotFound {
			// Target belongs to no branch → not in the caller's branch.
			return apperrors.Forbidden("you can only manage staff of your own branch")
		}
		return err
	}
	if targetMb.BranchID != callerMb.BranchID {
		return apperrors.Forbidden("you can only manage staff of your own branch")
	}
	return nil
}

// enrich attaches role + branch (when assigned) to a profile. Used for
// staff-management views where the target is always treated as staff.
func (s *userService) enrich(ctx context.Context, prof *dto.ProfileResponse) error {
	roles, err := s.rbacSvc.GetUserRoles(ctx, prof.UserID)
	if err != nil {
		return err
	}
	prof.Roles = roles

	brief, err := s.membershipBranch(ctx, prof.UserID)
	if err != nil {
		return err
	}
	prof.Branch = brief
	return nil
}

// enrichIfStaff attaches role + branch only when the user is staff. Plain
// customers/guests are left untouched so their response is unchanged.
func (s *userService) enrichIfStaff(ctx context.Context, prof *dto.ProfileResponse) error {
	roles, err := s.rbacSvc.GetUserRoles(ctx, prof.UserID)
	if err != nil {
		return err
	}
	if isCustomerOnly(roles) {
		return nil
	}
	prof.Roles = roles

	brief, err := s.membershipBranch(ctx, prof.UserID)
	if err != nil {
		return err
	}
	prof.Branch = brief
	return nil
}

// membershipBranch returns the user's branch brief, or nil when the user
// belongs to no branch (e.g. super_admin, product_manager).
func (s *userService) membershipBranch(ctx context.Context, userID uuid.UUID) (*dto.BranchBrief, error) {
	mb, err := s.membershipSvc.GetMembership(ctx, userID)
	if err != nil {
		var ae *apperrors.AppError
		if errors.As(err, &ae) && ae.Code == apperrors.CodeNotFound {
			return nil, nil
		}
		return nil, err
	}
	return s.branchBrief(ctx, mb.BranchID)
}

func (s *userService) branchBrief(ctx context.Context, branchID uuid.UUID) (*dto.BranchBrief, error) {
	br, err := s.branchSvc.GetBranchByID(ctx, branchID)
	if err != nil {
		return nil, err
	}
	return &dto.BranchBrief{ID: br.ID, Name: br.Name, Address: br.Address}, nil
}

func isCustomerOnly(roles []string) bool {
	for _, r := range roles {
		if r != "customer" && r != "guest" {
			return false
		}
	}
	return true
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
