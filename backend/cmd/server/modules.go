package main

import (
	"github.com/octguy/bakerio/backend/internal/auth"
	"github.com/octguy/bakerio/backend/internal/branch"
	"github.com/octguy/bakerio/backend/internal/cart"
	"github.com/octguy/bakerio/backend/internal/membership"
	"github.com/octguy/bakerio/backend/internal/notification"
	"github.com/octguy/bakerio/backend/internal/order"
	"github.com/octguy/bakerio/backend/internal/platform/email"
	"github.com/octguy/bakerio/backend/internal/product"
	"github.com/octguy/bakerio/backend/internal/statistics"
	"github.com/octguy/bakerio/backend/internal/user"
	"github.com/octguy/bakerio/backend/internal/voucher"
	"github.com/octguy/bakerio/backend/pkg/config"
)

// modules bundles every business module so the rest of main can pass a single
// value around instead of a long argument list.
type modules struct {
	auth       *auth.Module
	user       *user.Module
	branch     *branch.Module
	product    *product.Module
	cart       *cart.Module
	order      *order.Module
	voucher    *voucher.Module
	membership *membership.Module
	statistics *statistics.Module
	notif      *notification.Module
}

// buildModules constructs every module and resolves all cross-module wiring.
// The pattern is uniform:
//  1. each module is created via Xxx.New(Xxx.Deps{...});
//  2. modules with late dependencies are finished via .Wire(Xxx.LateDeps{...})
//     once their providers exist.
//
// User and product must be constructed before branch's Wire so the
// UserDirectory + ProductSeeder adapters are available; cart must be last
// because it consumes the product catalog.
func buildModules(cfg *config.Config, i *infra) *modules {
	userMod := user.New(user.Deps{Pool: i.pool, TX: i.tx})
	branchMod := branch.New(branch.Deps{Pool: i.pool, TX: i.tx})
	productMod := product.New(product.Deps{Pool: i.pool, TX: i.tx, Store: i.objectStore})
	notifMod := notification.New(notification.Deps{
		Mail: email.NewMailService(cfg.Email, cfg.Server),
		OTP:  i.otpService,
	})
	authMod := auth.New(auth.Deps{
		Pool:           i.pool,
		Redis:          i.redis,
		TX:             i.tx,
		ProfileCreator: userMod.ProfileService(),
		Outbox:         i.outboxRepo,
		OTP:            i.otpService,
		JWTSecret:      cfg.JWT.SecretKey,
		JWTExpiry:      cfg.JWT.Expiry,
	})

	// Late wiring (each module's Wire resolves the cross-module bits).
	userMod.Wire(user.LateDeps{
		Auth:       authMod.AuthService(),
		RBAC:       authMod.RBACService(),
		Membership: branchMod.MembershipService(),
		Branch:     branchMod.BranchService(),
	})
	productMod.Wire(product.LateDeps{
		BranchLister: branchMod.BranchService(),
		Membership:   branchMod.MembershipService(),
	})
	branchMod.Wire(branch.LateDeps{
		Directory: userMod.UserDirectory(),
		Seeder:    productMod.ProductService(),
	})

	cartMod := cart.New(cart.Deps{
		Pool:    i.pool,
		Catalog: productMod.ProductService(),
	})

	voucherMod := voucher.New(voucher.Deps{Pool: i.pool})
	membershipMod := membership.New(membership.Deps{Pool: i.pool})
	statisticsMod := statistics.New(statistics.Deps{
		Pool:       i.pool,
		Membership: branchMod.MembershipService(),
	})

	// Order module consumes the branch router (read-side for routing) +
	// the product service (Catalog for prices + stock lock/decrement) +
	// the branch membership service (so order:view:branch callers get
	// auto-scoped to their own branch on GET /orders) +
	// the voucher service (Validate at select-branch, Redeem at confirm).
	// Confirm flow opens its own tx via the shared TxManager.
	orderMod := order.New(order.Deps{
		Pool:           i.pool,
		TX:             i.tx,
		Redis:          i.redis,
		Router:         branchMod.Router(),
		Catalog:        productMod.ProductService(),
		Membership:     branchMod.MembershipService(),
		Voucher:        voucherMod.Service(),
		UserMembership: membershipMod.Service(),
	})

	return &modules{
		auth:       authMod,
		user:       userMod,
		branch:     branchMod,
		product:    productMod,
		cart:       cartMod,
		order:      orderMod,
		voucher:    voucherMod,
		membership: membershipMod,
		statistics: statisticsMod,
		notif:      notifMod,
	}
}
