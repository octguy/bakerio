package service

import (
	"context"

	"github.com/google/uuid"
	authSvc "github.com/octguy/bakerio/backend/internal/auth/service"
	branchSvc "github.com/octguy/bakerio/backend/internal/branch/service"
)

// userDirectory implements branch.UserDirectory by composing profile (name),
// auth (email) and RBAC (roles). It lets the branch module enrich member
// responses without importing the user/auth modules directly.
type userDirectory struct {
	profileSvc ProfileService
	authSvc    authSvc.AuthService
	rbacSvc    authSvc.RBACService
}

func NewUserDirectory(profileSvc ProfileService, auth authSvc.AuthService, rbac authSvc.RBACService) branchSvc.UserDirectory {
	return &userDirectory{profileSvc: profileSvc, authSvc: auth, rbacSvc: rbac}
}

func (d *userDirectory) GetUsersInfo(ctx context.Context, ids []uuid.UUID) ([]branchSvc.UserInfo, error) {
	out := make([]branchSvc.UserInfo, 0, len(ids))
	for _, id := range ids {
		prof, err := d.profileSvc.GetProfile(ctx, id)
		if err != nil {
			return nil, err
		}
		email, err := d.authSvc.GetEmailByUserID(ctx, id)
		if err != nil {
			return nil, err
		}
		roles, err := d.rbacSvc.GetUserRoles(ctx, id)
		if err != nil {
			return nil, err
		}
		out = append(out, branchSvc.UserInfo{
			UserID:      id,
			DisplayName: prof.DisplayName,
			Email:       email,
			Roles:       roles,
		})
	}
	return out, nil
}
