package main

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	authService "github.com/octguy/bakerio/backend/internal/auth/service"
	"github.com/octguy/bakerio/backend/internal/platform/logger"
	"go.uber.org/zap"
)

type adminSeed struct {
	email, fullName, password, role string
}

// seedAdmins creates the built-in system accounts on startup.
// Each entry is idempotent: if the email is already taken, it's skipped.
//
// Note: super_admin and product_manager are org-wide roles — they do NOT
// belong to a single branch. branch_staff and branch_manager DO belong to
// a branch but are seeded by the admin-triggered POST /admin/seed-demo
// (where the branches actually exist by then).
func seedAdmins(ctx context.Context, svc authService.AuthService, pool *pgxpool.Pool) {
	_ = pool // kept for future seed steps that need direct SQL
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
			// ErrEmailTaken = account already exists. Treat as a no-op so
			// boot stays idempotent on a warm DB.
			logger.Log.Debug("seed: skipped", zap.String("email", a.email), zap.Error(err))
			continue
		}
		logger.Log.Info("seed: admin created", zap.String("email", res.Email), zap.String("role", a.role))
	}
}
