// @title           Bakerio API
// @version         1.0
// @description     Bakerio bakery marketplace backend API.

// @host      localhost:8080
// @BasePath  /api/v1

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Type "Bearer" followed by a space and the access token.

package main

import (
	"context"
	"os/signal"
	"syscall"

	"github.com/octguy/bakerio/backend/internal/platform/logger"
	"github.com/octguy/bakerio/backend/internal/platform/outbox"
	"github.com/octguy/bakerio/backend/pkg/config"
	"go.uber.org/zap"

	_ "github.com/octguy/bakerio/backend/docs"
)

func main() {
	cfg := config.Load()
	must("logger init", logger.Init(cfg.Server.Env))
	defer logger.Sync()

	// Cancel on SIGINT/SIGTERM for graceful shutdown.
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	// Infrastructure (DB, Redis, RabbitMQ, MinIO, tx, outbox, otp).
	i := setupInfra(ctx, cfg)
	defer i.Close()

	// Business modules + cross-module wiring.
	mods := buildModules(cfg, i)

	// Startup tasks.
	must("rbac cache warm", mods.auth.RBACService().WarmPermissionCache(ctx))
	// Bootstrap only the system accounts (super_admin / product_manager / a few
	// customers). The large demo seed (branches, products, staff, …) is exposed
	// as an admin-triggered endpoint: POST /admin/seed-demo.
	seedAdmins(ctx, mods.auth.AuthService(), i.pool)

	// Background workers.
	go outbox.NewWorker(i.publisher, logger.Log, i.outboxRepo).Run(ctx)
	must("notification consumers", mods.notif.RegisterConsumers(ctx, i.consumer))

	// HTTP — blocks until shutdown.
	runHTTPServer(cfg, i, mods)
}

// must fatals on err with a contextual label. Use only for startup failures
// where exiting is the only sensible behaviour.
func must(label string, err error) {
	if err != nil {
		logger.Log.Fatal("startup: "+label+" failed", zap.Error(err))
	}
}
