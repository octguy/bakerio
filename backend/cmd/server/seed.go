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

// seedAdmins creates the built-in admin/manager accounts on startup.
// Each entry is idempotent: if the email is already taken, it's skipped.
func seedAdmins(ctx context.Context, svc authService.AuthService, pool *pgxpool.Pool) {
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

		// If the user has a staff role, assign them to the default branch so they are listed in staff queries
		if a.role == "super_admin" || a.role == "product_manager" {
			_, err = pool.Exec(ctx, `
				INSERT INTO branch.branch_memberships (user_id, branch_id)
				VALUES ($1, '00000000-0000-0000-0000-000000000101')
				ON CONFLICT (user_id) DO NOTHING
			`, res.ID)
			if err != nil {
				logger.Log.Warn("seed: failed to assign default branch membership", zap.String("email", a.email), zap.Error(err))
			}
		}
	}
}
