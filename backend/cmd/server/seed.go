package main

import (
	"context"

	authService "github.com/octguy/bakerio/backend/internal/auth/service"
	"github.com/octguy/bakerio/backend/internal/platform/logger"
	"go.uber.org/zap"
)

type adminSeed struct {
	email, fullName, password, role string
}

// seedAdmins creates the built-in admin/manager accounts on startup.
// Each entry is idempotent: if the email is already taken, it's skipped.
func seedAdmins(ctx context.Context, svc authService.AuthService) {
	admins := []adminSeed{
		{"superadmin@bakerio.com", "Super Admin", "123456", "super_admin"},
		{"productmanager@bakerio.com", "Product Manager", "123456", "product_manager"},
		{"customer1@bakerio.com", "Customer 1", "123456", "customer"},
		{"customer2@bakerio.com", "Customer 2", "123456", "customer"},
		{"customer3@bakerio.com", "Customer 3", "123456", "customer"},
	}
	for _, a := range admins {
		res, err := svc.CreateStaff(ctx, a.email, a.fullName, a.password, a.role)
		if err != nil {
			// ErrEmailTaken means the account already exists — skip silently
			logger.Log.Debug("seed: skipped", zap.String("email", a.email), zap.Error(err))
			continue
		}
		logger.Log.Info("seed: admin created", zap.String("email", res.Email), zap.String("role", a.role))
	}
}
