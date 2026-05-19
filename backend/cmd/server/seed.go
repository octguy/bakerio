package main

import (
	"context"
	"os"

	"github.com/google/uuid"
	authService "github.com/octguy/bakerio/backend/internal/auth/service"
	branchdto "github.com/octguy/bakerio/backend/internal/branch/dto"
	branchService "github.com/octguy/bakerio/backend/internal/branch/service"
	"github.com/octguy/bakerio/backend/internal/platform/logger"
	"go.uber.org/zap"
)

type adminSeed struct {
	email, fullName, password, role string
}

// seedAdmins creates the built-in admin/manager accounts on startup.
// Each entry is idempotent: if the email is already taken, it's skipped.
func seedAdmins(ctx context.Context, svc authService.AuthService, branchSvc branchService.BranchService) {
	seedPassword := os.Getenv("SEED_ADMIN_PASSWORD")
	if seedPassword == "" {
		if os.Getenv("SERVER_ENV") == "production" {
			logger.Log.Warn("seed: SEED_ADMIN_PASSWORD not set in production, skipping seed")
			return
		}
		seedPassword = "123456"
	}

	// Ensure a default branch exists for store-level seeds
	var defaultBranchID *uuid.UUID
	branches, _ := branchSvc.GetAllBranches(ctx)
	if len(branches) > 0 {
		defaultBranchID = &branches[0].ID
	} else {
		created, err := branchSvc.CreateBranch(ctx, branchdto.CreateBranchRequest{
			Name: "Default Branch", Address: "Ho Chi Minh City", Region: "south",
		})
		if err == nil {
			defaultBranchID = &created.ID
		}
	}

	admins := []adminSeed{
		{"superadmin@bakerio.com", "Super Admin", seedPassword, "super_admin"},
		{"gm@bakerio.com", "General Manager", seedPassword, "general_manager"},
		{"inventory@bakerio.com", "Inventory Manager", seedPassword, "inventory_manager"},
		{"marketing@bakerio.com", "Marketing Manager", seedPassword, "marketing_manager"},
		{"store@bakerio.com", "Store Manager", seedPassword, "store_manager"},
	}
	for _, a := range admins {
		var bid *uuid.UUID
		if a.role == "store_manager" {
			bid = defaultBranchID
		}
		res, err := svc.CreateStaff(ctx, a.email, a.fullName, a.password, a.role, bid)
		if err != nil {
			logger.Log.Debug("seed: skipped", zap.String("email", a.email), zap.Error(err))
			continue
		}
		logger.Log.Info("seed: admin created", zap.String("email", res.Email), zap.String("role", a.role))
	}
}
