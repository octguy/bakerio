package main

import (
	"context"
	cryptoRand "crypto/rand"
	"fmt"
	"math"
	"math/rand"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/octguy/bakerio/backend/internal/platform/logger"
	"github.com/octguy/bakerio/backend/internal/shared/authcontext"
	"github.com/octguy/bakerio/backend/internal/shared/response"
	"github.com/shopspring/decimal"
	"go.uber.org/zap"
)

// SeedDemoSummary is the response body for POST /admin/seed-demo.
type SeedDemoSummary struct {
	Skipped        bool `json:"skipped"`         // true if branches already existed → no inserts done
	Branches       int  `json:"branches"`        // number of branches now in DB
	Categories     int  `json:"categories"`      // number of categories now in DB
	Products       int  `json:"products"`        // number of products now in DB
	BranchProducts int  `json:"branch_products"` // (product × branch) availability rows
	Customers      int  `json:"customers"`       // number of customer accounts
	Staff          int  `json:"staff"`           // managers + staff combined
	Addresses      int  `json:"addresses"`       // saved customer addresses
	Orders         int  `json:"orders"`          // placed orders
	Vouchers       int  `json:"vouchers"`        // seeded voucher codes
} // @name SeedDemoSummary

// seedDemoData populates a fresh database with realistic sample data for manual
// API testing. Idempotent — skips when branches already exist.
//
// Boot-time `seed.go` (seedAdmins) creates only the system accounts.
// This larger seed is admin-triggered via POST /admin/seed-demo.
func seedDemoData(ctx context.Context, mods *modules, pool *pgxpool.Pool) SeedDemoSummary {
	var branches int
	if err := pool.QueryRow(ctx, "SELECT COUNT(*) FROM branch.branches").Scan(&branches); err != nil {
		logger.Log.Warn("seed demo: count branches failed", zap.Error(err))
		return SeedDemoSummary{}
	}
	if branches > 0 {
		logger.Log.Info("seed demo: skipping (already populated)", zap.Int("branches", branches))
		return readSeedCounts(ctx, pool, true)
	}

	// Act as super_admin so created_by audit columns get populated.
	var adminID uuid.UUID
	if err := pool.QueryRow(ctx,
		"SELECT id FROM auth.users WHERE email = 'superadmin@bakerio.com'").Scan(&adminID); err != nil {
		logger.Log.Warn("seed demo: super_admin missing, skipping", zap.Error(err))
		return SeedDemoSummary{}
	}
	ctx = authcontext.WithCaller(ctx, adminID)

	logger.Log.Info("seed demo: populating sample data")
	branchIDs := seedBranches(ctx, pool)
	catIDs := seedCategories(ctx, pool, adminID)
	seedProducts(ctx, pool, adminID, catIDs)
	activateAllBranchProducts(ctx, pool, adminID)
	seedBranchProductQuantities(ctx, pool)
	seedExtraCustomers(ctx, mods)
	seedBranchStaff(ctx, mods, branchIDs)
	seedCustomerAddresses(ctx, pool)
	seedDemoOrders(ctx, pool)
	seedVouchers(ctx, pool, adminID)

	return readSeedCounts(ctx, pool, false)
}

// readSeedCounts queries the live row counts so the response is informative
// whether the seed ran fresh or was a no-op.
func readSeedCounts(ctx context.Context, pool *pgxpool.Pool, skipped bool) SeedDemoSummary {
	s := SeedDemoSummary{Skipped: skipped}
	scan := func(query string, dst *int) {
		_ = pool.QueryRow(ctx, query).Scan(dst)
	}
	scan("SELECT COUNT(*) FROM branch.branches", &s.Branches)
	scan("SELECT COUNT(*) FROM product.categories", &s.Categories)
	scan("SELECT COUNT(*) FROM product.products", &s.Products)
	scan("SELECT COUNT(*) FROM product.branch_products", &s.BranchProducts)
	// Customers = users with the customer role only.
	scan(`SELECT COUNT(DISTINCT ur.user_id) FROM auth.user_roles ur
	      JOIN auth.roles r ON r.id = ur.role_id WHERE r.name = 'customer'`, &s.Customers)
	// Staff = users with any non-customer/guest role.
	scan(`SELECT COUNT(DISTINCT ur.user_id) FROM auth.user_roles ur
	      JOIN auth.roles r ON r.id = ur.role_id WHERE r.name NOT IN ('customer', 'guest')`, &s.Staff)
	scan("SELECT COUNT(*) FROM users.addresses", &s.Addresses)
	scan("SELECT COUNT(*) FROM orders.orders", &s.Orders)
	scan("SELECT COUNT(*) FROM voucher.vouchers", &s.Vouchers)
	return s
}

// ─────────────────────────────────────────────────────────────────────────────
// Branches — 10 spread across HCMC
// ─────────────────────────────────────────────────────────────────────────────

func seedBranches(ctx context.Context, pool *pgxpool.Pool) []uuid.UUID {
	type b struct {
		name, address string
		lat, lng      float64
	}
	rows := []b{
		{"District 1 — Saigon Square", "23 Le Loi, Quan 1, HCMC", 10.7769, 106.7009},
		{"District 3 — Ben Thanh", "456 Vo Van Tan, Quan 3, HCMC", 10.7813, 106.6915},
		{"District 4 — Khanh Hoi", "78 Doan Van Bo, Quan 4, HCMC", 10.7569, 106.7000},
		{"District 5 — Cho Lon", "210 Tran Hung Dao B, Quan 5, HCMC", 10.7558, 106.6633},
		{"District 7 — Phu My Hung", "12 Tan Phong, Quan 7, HCMC", 10.7330, 106.7195},
		{"District 10 — Su Van Hanh", "350 Su Van Hanh, Quan 10, HCMC", 10.7708, 106.6678},
		{"Tan Binh — Cong Hoa", "45 Cong Hoa, Tan Binh, HCMC", 10.8011, 106.6478},
		{"Phu Nhuan — Phan Xich Long", "88 Phan Xich Long, Phu Nhuan, HCMC", 10.7949, 106.6841},
		{"Binh Thanh — Hang Xanh", "120 Bach Dang, Binh Thanh, HCMC", 10.8000, 106.7100},
		{"Thu Duc — Linh Trung", "Khu Pho 6, Linh Trung, Thu Duc, HCMC", 10.8500, 106.7715},
	}
	out := make([]uuid.UUID, 0, len(rows))
	for _, r := range rows {
		var id uuid.UUID
		err := pool.QueryRow(ctx,
			`INSERT INTO branch.branches (name, address, lat, lng) VALUES ($1, $2, $3, $4) RETURNING id`,
			r.name, r.address, r.lat, r.lng,
		).Scan(&id)
		if err != nil {
			logger.Log.Warn("seed demo: branch insert failed", zap.String("name", r.name), zap.Error(err))
			continue
		}
		out = append(out, id)
	}
	return out
}

// ─────────────────────────────────────────────────────────────────────────────
// Categories — 10
// ─────────────────────────────────────────────────────────────────────────────

func seedCategories(ctx context.Context, pool *pgxpool.Pool, adminID uuid.UUID) map[string]uuid.UUID {
	names := []string{
		"Breads", "Cakes", "Pastries", "Drinks", "Cookies",
		"Sandwiches", "Coffee", "Hot Drinks", "Pizza", "Donuts",
	}
	out := make(map[string]uuid.UUID, len(names))
	for i, name := range names {
		var id uuid.UUID
		err := pool.QueryRow(ctx,
			`INSERT INTO product.categories (name, slug, sort_order, created_by, updated_by)
			 VALUES ($1, $2, $3, $4, $4) RETURNING id`,
			name, slugifyDemo(name), int32(i+1), adminID,
		).Scan(&id)
		if err != nil {
			logger.Log.Warn("seed demo: category insert failed", zap.String("name", name), zap.Error(err))
			continue
		}
		out[name] = id
	}
	return out
}

// ─────────────────────────────────────────────────────────────────────────────
// Products — ~80 across 10 categories
// ─────────────────────────────────────────────────────────────────────────────

func seedProducts(ctx context.Context, pool *pgxpool.Pool, adminID uuid.UUID, catIDs map[string]uuid.UUID) []uuid.UUID {
	type p struct {
		category string
		name     string
		price    string
	}
	// Prices stored as raw VND (the unit payment gateways expect: MoMo,
	// VNPay, ZaloPay all want integer amounts). The .00 is cosmetic — the
	// column is NUMERIC(12,2) but VND has no fractional dong.
	rows := []p{
		// Breads (8)
		{"Breads", "Baguette", "25000"},
		{"Breads", "Sourdough Loaf", "45000"},
		{"Breads", "Multigrain Loaf", "50000"},
		{"Breads", "Brioche", "40000"},
		{"Breads", "Focaccia", "55000"},
		{"Breads", "Rye Bread", "48000"},
		{"Breads", "Ciabatta", "42000"},
		{"Breads", "Whole Wheat", "35000"},
		// Cakes (9)
		{"Cakes", "Tiramisu", "95000"},
		{"Cakes", "Chocolate Cake", "120000"},
		{"Cakes", "Cheesecake", "110000"},
		{"Cakes", "Black Forest", "130000"},
		{"Cakes", "Red Velvet", "115000"},
		{"Cakes", "Carrot Cake", "90000"},
		{"Cakes", "Lemon Drizzle", "85000"},
		{"Cakes", "Opera Cake", "140000"},
		{"Cakes", "Pound Cake", "75000"},
		// Pastries (10)
		{"Pastries", "Croissant", "35000"},
		{"Pastries", "Pain au Chocolat", "38000"},
		{"Pastries", "Eclair", "35000"},
		{"Pastries", "Macaron", "25000"},
		{"Pastries", "Mille-feuille", "45000"},
		{"Pastries", "Profiterole", "40000"},
		{"Pastries", "Danish", "30000"},
		{"Pastries", "Apple Turnover", "32000"},
		{"Pastries", "Cinnamon Roll", "38000"},
		{"Pastries", "Palmier", "22000"},
		// Drinks (9)
		{"Drinks", "Iced Tea", "25000"},
		{"Drinks", "Smoothie", "65000"},
		{"Drinks", "Lemonade", "30000"},
		{"Drinks", "Orange Juice", "35000"},
		{"Drinks", "Apple Juice", "32000"},
		{"Drinks", "Iced Lemon Tea", "28000"},
		{"Drinks", "Sparkling Water", "20000"},
		{"Drinks", "Coconut Water", "30000"},
		{"Drinks", "Soda", "22000"},
		// Cookies (8)
		{"Cookies", "Chocolate Chip Cookie", "15000"},
		{"Cookies", "Oatmeal Cookie", "12000"},
		{"Cookies", "Sugar Cookie", "10000"},
		{"Cookies", "Snickerdoodle", "14000"},
		{"Cookies", "Shortbread", "18000"},
		{"Cookies", "Peanut Butter Cookie", "16000"},
		{"Cookies", "Double Chocolate Cookie", "17000"},
		{"Cookies", "Macadamia Cookie", "20000"},
		// Sandwiches (8)
		{"Sandwiches", "Ham & Cheese", "65000"},
		{"Sandwiches", "Veggie Wrap", "55000"},
		{"Sandwiches", "BLT", "70000"},
		{"Sandwiches", "Tuna Melt", "75000"},
		{"Sandwiches", "Avocado Toast", "60000"},
		{"Sandwiches", "Club Sandwich", "85000"},
		{"Sandwiches", "Turkey Sub", "80000"},
		{"Sandwiches", "Chicken Caesar Wrap", "78000"},
		// Coffee (8)
		{"Coffee", "Espresso", "35000"},
		{"Coffee", "Americano", "38000"},
		{"Coffee", "Latte", "45000"},
		{"Coffee", "Cappuccino", "50000"},
		{"Coffee", "Mocha", "55000"},
		{"Coffee", "Macchiato", "48000"},
		{"Coffee", "Flat White", "50000"},
		{"Coffee", "Cold Brew", "60000"},
		// Hot Drinks (6)
		{"Hot Drinks", "Hot Chocolate", "55000"},
		{"Hot Drinks", "Earl Grey Tea", "30000"},
		{"Hot Drinks", "Green Tea", "28000"},
		{"Hot Drinks", "Chamomile Tea", "32000"},
		{"Hot Drinks", "Chai Latte", "55000"},
		{"Hot Drinks", "Matcha Latte", "65000"},
		// Pizza (7)
		{"Pizza", "Margherita", "150000"},
		{"Pizza", "Pepperoni", "170000"},
		{"Pizza", "Quattro Formaggi", "180000"},
		{"Pizza", "Hawaiian", "160000"},
		{"Pizza", "BBQ Chicken", "175000"},
		{"Pizza", "Veggie Supreme", "165000"},
		{"Pizza", "Meat Lovers", "190000"},
		// Donuts (7)
		{"Donuts", "Glazed Donut", "20000"},
		{"Donuts", "Chocolate Donut", "22000"},
		{"Donuts", "Strawberry Donut", "24000"},
		{"Donuts", "Boston Cream", "28000"},
		{"Donuts", "Old Fashioned", "20000"},
		{"Donuts", "Maple Bar", "25000"},
		{"Donuts", "Cruller", "22000"},
	}
	out := make([]uuid.UUID, 0, len(rows))
	for i, r := range rows {
		catID, ok := catIDs[r.category]
		if !ok {
			continue
		}
		var id uuid.UUID
		err := pool.QueryRow(ctx,
			`INSERT INTO product.products
			   (name, slug, category_id, price, sort_order, is_active, created_by, updated_by)
			 VALUES ($1, $2, $3, $4, $5, TRUE, $6, $6)
			 RETURNING id`,
			r.name, slugifyDemo(r.name), catID, r.price, int32(i+1), adminID,
		).Scan(&id)
		if err != nil {
			logger.Log.Warn("seed demo: product insert failed", zap.String("name", r.name), zap.Error(err))
			continue
		}
		out = append(out, id)
	}
	return out
}

// activateAllBranchProducts creates the (product × branch) availability matrix
// in one shot, all active.
func activateAllBranchProducts(ctx context.Context, pool *pgxpool.Pool, adminID uuid.UUID) {
	_, err := pool.Exec(ctx,
		`INSERT INTO product.branch_products (product_id, branch_id, is_active, created_by, updated_by)
		 SELECT p.id, b.id, TRUE, $1, $1
		 FROM product.products p
		 CROSS JOIN branch.branches b
		 ON CONFLICT (product_id, branch_id) DO UPDATE
		    SET is_active = TRUE, updated_at = NOW(), updated_by = EXCLUDED.updated_by`,
		adminID,
	)
	if err != nil {
		logger.Log.Warn("seed demo: branch_products activation failed", zap.Error(err))
	}
}

// seedBranchProductQuantities randomizes per-(branch, product) stock so dev
// data exercises the order-routing eligibility rules immediately. Tiers match
// the price bands in seedProducts: cheap high-volume goods get big stock,
// expensive cakes/pizzas get small batches and will sell out during testing.
func seedBranchProductQuantities(ctx context.Context, pool *pgxpool.Pool) {
	_, err := pool.Exec(ctx, `
		UPDATE product.branch_products bp
		SET quantity = CASE
		    WHEN p.price < 50000  THEN (floor(random() * 61) + 20)::int  -- 20..80
		    WHEN p.price < 100000 THEN (floor(random() * 31) + 10)::int  -- 10..40
		    ELSE                       (floor(random() * 13) + 3)::int   -- 3..15
		END
		FROM product.products p
		WHERE bp.product_id = p.id`)
	if err != nil {
		logger.Log.Warn("seed demo: quantity randomization failed", zap.Error(err))
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Customers — 20 via auth.Register (password hashing handled by the service)
// ─────────────────────────────────────────────────────────────────────────────

// seedExtraCustomers creates customer accounts as active + verified in one
// step using auth.CreateStaff. Despite the name, CreateStaff is the auth
// service's "create-an-activated-account-with-any-role" primitive and is the
// correct path for seed data — it skips the OTP email-verification flow that
// the real Register endpoint requires.
func seedExtraCustomers(ctx context.Context, mods *modules) {
	type c struct{ email, name string }
	rows := []c{
		{"alice@bakerio.com", "Alice Tran"},
		{"bob@bakerio.com", "Bob Nguyen"},
		{"charlie@bakerio.com", "Charlie Le"},
		{"diana@bakerio.com", "Diana Pham"},
		{"ethan@bakerio.com", "Ethan Vo"},
		{"fiona@bakerio.com", "Fiona Hoang"},
		{"george@bakerio.com", "George Bui"},
		{"hannah@bakerio.com", "Hannah Truong"},
		{"ivan@bakerio.com", "Ivan Do"},
		{"julia@bakerio.com", "Julia Dang"},
		{"kevin@bakerio.com", "Kevin Mai"},
		{"laura@bakerio.com", "Laura Vu"},
		{"mike@bakerio.com", "Mike Phan"},
		{"nora@bakerio.com", "Nora Ta"},
		{"oscar@bakerio.com", "Oscar Ngo"},
		{"paula@bakerio.com", "Paula Lam"},
		{"quincy@bakerio.com", "Quincy Cao"},
		{"rachel@bakerio.com", "Rachel Ly"},
		{"simon@bakerio.com", "Simon Trinh"},
		{"tina@bakerio.com", "Tina Thai"},
	}
	for _, r := range rows {
		if _, err := mods.auth.AuthService().CreateStaff(ctx, r.email, r.name, "123456", "customer"); err != nil {
			logger.Log.Warn("seed demo: customer create failed",
				zap.String("email", r.email), zap.Error(err))
		}
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Staff — 1 manager + 2 staff per branch (= 30 accounts)
// ─────────────────────────────────────────────────────────────────────────────

func seedBranchStaff(ctx context.Context, mods *modules, branchIDs []uuid.UUID) {
	// Suffixes used to make staff emails unique within a branch.
	staffSuffixes := []string{"a", "b"}
	for i, branchID := range branchIDs {
		idx := i + 1
		// 1 manager per branch
		createBranchUser(ctx, mods, branchID,
			fmt.Sprintf("manager%d@bakerio.com", idx),
			fmt.Sprintf("Manager %d", idx),
			"branch_manager")
		// 2 staff per branch (suffixed a/b for unique emails)
		for _, suf := range staffSuffixes {
			createBranchUser(ctx, mods, branchID,
				fmt.Sprintf("staff%d%s@bakerio.com", idx, suf),
				fmt.Sprintf("Staff %d-%s", idx, suf),
				"branch_staff")
		}
	}
}

func createBranchUser(ctx context.Context, mods *modules, branchID uuid.UUID, email, name, role string) {
	resp, err := mods.auth.AuthService().CreateStaff(ctx, email, name, "123456", role)
	if err != nil {
		logger.Log.Warn("seed demo: staff create failed",
			zap.String("email", email), zap.String("role", role), zap.Error(err))
		return
	}
	if err := mods.branch.MembershipService().SetMembership(ctx, resp.ID, branchID); err != nil {
		logger.Log.Warn("seed demo: staff membership failed",
			zap.String("email", email), zap.Error(err))
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Customer addresses — 2 per customer (1 default + 1 alternate), picked from
// an HCMC pool. Inserts directly so the partial unique index is hit once per
// user (no need to call ClearDefault first since there are no rows yet).
// ─────────────────────────────────────────────────────────────────────────────

func seedCustomerAddresses(ctx context.Context, pool *pgxpool.Pool) {
	type a struct {
		text     string
		lat, lng float64
	}
	pool_addr := []a{
		{"12 Nguyen Hue, Quan 1, HCMC", 10.7747, 106.7025},
		{"88 Le Thanh Ton, Quan 1, HCMC", 10.7780, 106.7037},
		{"45 Vo Van Tan, Quan 3, HCMC", 10.7820, 106.6900},
		{"210 Nam Ky Khoi Nghia, Quan 3, HCMC", 10.7860, 106.6915},
		{"33 Hoang Dieu, Quan 4, HCMC", 10.7615, 106.7045},
		{"77 Tran Hung Dao, Quan 5, HCMC", 10.7560, 106.6720},
		{"5 Nguyen Van Linh, Quan 7, HCMC", 10.7290, 106.7180},
		{"99 Cong Hoa, Tan Binh, HCMC", 10.8020, 106.6510},
		{"21 Phan Xich Long, Phu Nhuan, HCMC", 10.7960, 106.6850},
		{"150 Dien Bien Phu, Binh Thanh, HCMC", 10.8005, 106.7080},
		{"7 Vo Van Ngan, Thu Duc, HCMC", 10.8490, 106.7705},
		{"66 Le Van Sy, Phu Nhuan, HCMC", 10.7900, 106.6790},
	}

	rows, err := pool.Query(ctx, `
		SELECT u.id
		FROM auth.users u
		JOIN auth.user_roles ur ON ur.user_id = u.id
		JOIN auth.roles r       ON r.id = ur.role_id
		WHERE r.name = 'customer'
		ORDER BY u.created_at`)
	if err != nil {
		logger.Log.Warn("seed demo: list customers for addresses failed", zap.Error(err))
		return
	}
	defer rows.Close()

	var userIDs []uuid.UUID
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			continue
		}
		userIDs = append(userIDs, id)
	}

	inserted := 0
	for i, uid := range userIDs {
		def := pool_addr[(i*2)%len(pool_addr)]
		alt := pool_addr[(i*2+1)%len(pool_addr)]
		if _, err := pool.Exec(ctx,
			`INSERT INTO users.addresses (user_id, address, latitude, longitude, is_default)
			 VALUES ($1, $2, $3, $4, TRUE)`,
			uid, def.text, def.lat, def.lng,
		); err != nil {
			logger.Log.Warn("seed demo: address insert (default) failed", zap.String("user", uid.String()), zap.Error(err))
			continue
		}
		inserted++
		if _, err := pool.Exec(ctx,
			`INSERT INTO users.addresses (user_id, address, latitude, longitude, is_default)
			 VALUES ($1, $2, $3, $4, FALSE)`,
			uid, alt.text, alt.lat, alt.lng,
		); err != nil {
			logger.Log.Warn("seed demo: address insert (alt) failed", zap.String("user", uid.String()), zap.Error(err))
			continue
		}
		inserted++
	}
	logger.Log.Info("seed demo: addresses inserted", zap.Int("count", inserted), zap.Int("customers", len(userIDs)))
}

// ─────────────────────────────────────────────────────────────────────────────
// Orders — ~100 historic orders spread over the last 30 days.
//
// Direct SQL inside one tx per order; mirrors what /orders/confirm does
// (atomic stock decrement + insert order + items) so the seed data is
// internally consistent: branch_products.quantity drops by what the order
// took, totals match price snapshots, code is unique. Tries up to N*3
// attempts so unfittable carts retry rather than abort the whole seed.
// ─────────────────────────────────────────────────────────────────────────────

func seedDemoOrders(ctx context.Context, pool *pgxpool.Pool) {
	const targetOrders = 100
	const maxAttempts = targetOrders * 3

	type custRow struct {
		id       uuid.UUID
		address  string
		lat, lng float64
		phone    *string
	}
	type branchRow struct {
		id       uuid.UUID
		lat, lng float64
	}
	type prodRow struct {
		id    uuid.UUID
		name  string
		price decimal.Decimal
	}

	// 1. Customers with a default address.
	custs := []custRow{}
	rows, err := pool.Query(ctx, `
		SELECT u.id, a.address, a.latitude, a.longitude
		FROM auth.users u
		JOIN auth.user_roles ur ON ur.user_id = u.id
		JOIN auth.roles r       ON r.id = ur.role_id
		JOIN users.addresses a  ON a.user_id = u.id AND a.is_default = TRUE
		WHERE r.name = 'customer'`)
	if err != nil {
		logger.Log.Warn("seed demo: order customers query failed", zap.Error(err))
		return
	}
	for rows.Next() {
		var c custRow
		if err := rows.Scan(&c.id, &c.address, &c.lat, &c.lng); err == nil {
			custs = append(custs, c)
		}
	}
	rows.Close()

	// 2. Active branches with coords (filtered by routing eligibility later).
	branches := []branchRow{}
	rows, err = pool.Query(ctx, `
		SELECT id, lat, lng FROM branch.branches
		WHERE status = 'active' AND lat IS NOT NULL AND lng IS NOT NULL`)
	if err != nil {
		logger.Log.Warn("seed demo: order branches query failed", zap.Error(err))
		return
	}
	for rows.Next() {
		var b branchRow
		if err := rows.Scan(&b.id, &b.lat, &b.lng); err == nil {
			branches = append(branches, b)
		}
	}
	rows.Close()

	// 3. Products (active + undeleted).
	prods := []prodRow{}
	rows, err = pool.Query(ctx, `
		SELECT id, name, price FROM product.products
		WHERE is_active = TRUE AND deleted_at IS NULL`)
	if err != nil {
		logger.Log.Warn("seed demo: order products query failed", zap.Error(err))
		return
	}
	for rows.Next() {
		var p prodRow
		if err := rows.Scan(&p.id, &p.name, &p.price); err == nil {
			prods = append(prods, p)
		}
	}
	rows.Close()

	if len(custs) == 0 || len(branches) == 0 || len(prods) == 0 {
		logger.Log.Warn("seed demo: order preconditions missing",
			zap.Int("customers", len(custs)), zap.Int("branches", len(branches)), zap.Int("products", len(prods)))
		return
	}

	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	placed := 0
	for attempt := 0; placed < targetOrders && attempt < maxAttempts; attempt++ {
		cust := custs[rng.Intn(len(custs))]

		// 1..3 distinct items, qty 1..3 each.
		nItems := rng.Intn(3) + 1
		picked := map[uuid.UUID]bool{}
		var seedItems []seedOrderItem
		for len(seedItems) < nItems {
			p := prods[rng.Intn(len(prods))]
			if picked[p.id] {
				continue
			}
			picked[p.id] = true
			seedItems = append(seedItems, seedOrderItem{
				productID: p.id,
				name:      p.name,
				price:     p.price,
				qty:       int32(rng.Intn(3) + 1),
			})
		}

		// Pick the nearest branch that has stock for every item.
		var bestBranch *branchRow
		bestDist := math.MaxFloat64
		for i := range branches {
			b := branches[i]
			ok, err := branchHasStock(ctx, pool, b.id, seedItems)
			if err != nil || !ok {
				continue
			}
			d := haversineKmDemo(cust.lat, cust.lng, b.lat, b.lng)
			if d > 15.0 {
				continue // out of delivery range
			}
			if d < bestDist {
				bestDist = d
				bestBranch = &branches[i]
			}
		}
		if bestBranch == nil {
			continue // retry with a different cart
		}

		subtotal := decimal.Zero
		for _, it := range seedItems {
			subtotal = subtotal.Add(it.price.Mul(decimal.NewFromInt32(it.qty)))
		}
		shippingFee := decimal.NewFromInt(int64(tierFeeDemo(bestDist)))
		total := subtotal.Add(shippingFee)

		// Spread placed_at over the last 30 days for a realistic histogram.
		placedAt := time.Now().Add(-time.Duration(rng.Int63n(int64(30 * 24 * time.Hour))))

		code, err := genOrderCodeDemo(placedAt)
		if err != nil {
			continue
		}

		if err := insertOrderTx(ctx, pool, code, cust, *bestBranch, seedItems, subtotal, shippingFee, total, bestDist, placedAt); err != nil {
			// Stock race or unique-code collision — just try again.
			continue
		}
		placed++
	}
	logger.Log.Info("seed demo: orders inserted", zap.Int("count", placed), zap.Int("target", targetOrders))
}

// ─────────────────────────────────────────────────────────────────────────────
// Vouchers — 15 codes mixing every shape the validate flow needs:
//   • 5 plain percent codes (no cap, no min)
//   • 4 percent codes with max_discount cap
//   • 3 percent codes with min_subtotal floor
//   • 2 expired windows (already past)
//   • 1 inactive (is_active = false)
//
// Idempotent via ON CONFLICT (code) DO NOTHING so a re-run is a no-op.
// Money values are raw VND (NUMERIC(12,2)).
// ─────────────────────────────────────────────────────────────────────────────

func seedVouchers(ctx context.Context, pool *pgxpool.Pool, adminID uuid.UUID) {
	now := time.Now()
	farFuture := now.AddDate(1, 0, 0)
	wayPast := now.AddDate(0, -6, 0)
	stillPast := now.AddDate(0, -1, 0)

	type v struct {
		code        string
		percent     int16
		maxDiscount *string // raw VND, nil = no cap
		minSubtotal *string // raw VND, nil = no minimum
		validFrom   time.Time
		validTo     time.Time
		isActive    bool
	}
	s := func(s string) *string { return &s }

	rows := []v{
		// Plain percent (no caps) — the common case.
		{"WELCOME10", 10, nil, nil, now.AddDate(0, -1, 0), farFuture, true},
		{"BAKER15", 15, nil, nil, now.AddDate(0, -1, 0), farFuture, true},
		{"SWEET20", 20, nil, nil, now.AddDate(0, -1, 0), farFuture, true},
		{"NEWBIE5", 5, nil, nil, now.AddDate(0, -1, 0), farFuture, true},
		{"LOYAL25", 25, nil, nil, now.AddDate(0, -1, 0), farFuture, true},
		// Capped — high percent + low ceiling proves the cap math at confirm.
		{"CAP15K", 15, s("15000"), nil, now.AddDate(0, -1, 0), farFuture, true},
		{"CAP30K", 30, s("30000"), nil, now.AddDate(0, -1, 0), farFuture, true},
		{"CAP50K", 50, s("50000"), nil, now.AddDate(0, -1, 0), farFuture, true},
		{"BIGCAP", 40, s("100000"), nil, now.AddDate(0, -1, 0), farFuture, true},
		// Min-subtotal — exercises the VOUCHER_MIN_SUBTOTAL gate.
		{"SPEND50K", 10, nil, s("50000"), now.AddDate(0, -1, 0), farFuture, true},
		{"SPEND100K", 15, nil, s("100000"), now.AddDate(0, -1, 0), farFuture, true},
		{"SPEND200K", 20, s("60000"), s("200000"), now.AddDate(0, -1, 0), farFuture, true},
		// Negative paths — expired window + explicit inactive.
		{"EXPIRED10", 10, nil, nil, wayPast, stillPast, true},
		{"PAST20", 20, nil, nil, wayPast, stillPast, true},
		{"INACTIVE10", 10, nil, nil, now.AddDate(0, -1, 0), farFuture, false},
	}

	const stmt = `
INSERT INTO voucher.vouchers
    (code, discount_percent, max_discount, min_subtotal,
     valid_from, valid_to, is_active, created_by, updated_by)
VALUES ($1, $2, $3::numeric, $4::numeric, $5, $6, $7, $8, $8)
ON CONFLICT (code) DO NOTHING`

	var created int
	for _, r := range rows {
		ct, err := pool.Exec(ctx, stmt,
			r.code, r.percent, r.maxDiscount, r.minSubtotal,
			r.validFrom, r.validTo, r.isActive, adminID,
		)
		if err != nil {
			logger.Log.Warn("seed demo: voucher insert failed",
				zap.String("code", r.code), zap.Error(err))
			continue
		}
		if ct.RowsAffected() > 0 {
			created++
		}
	}
	logger.Log.Info("seed demo: vouchers inserted",
		zap.Int("created", created), zap.Int("attempted", len(rows)))
}

type seedOrderItem struct {
	productID uuid.UUID
	name      string
	price     decimal.Decimal
	qty       int32
}

// branchHasStock returns true if every item in the cart is active + in stock
// at the branch. Non-locking — concurrent seed writers can collide but we
// retry on the tx-level UPDATE failure, so the worst case is a wasted attempt.
func branchHasStock(ctx context.Context, pool *pgxpool.Pool, branchID uuid.UUID, items []seedOrderItem) (bool, error) {
	ids := make([]uuid.UUID, len(items))
	qtys := make([]int32, len(items))
	for i, it := range items {
		ids[i] = it.productID
		qtys[i] = it.qty
	}
	var n int
	err := pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM product.branch_products bp
		JOIN unnest($1::uuid[], $2::int[]) AS r(product_id, qty) ON r.product_id = bp.product_id
		WHERE bp.branch_id = $3 AND bp.is_active = TRUE AND bp.quantity >= r.qty`,
		ids, qtys, branchID).Scan(&n)
	if err != nil {
		return false, err
	}
	return n == len(items), nil
}

// insertOrderTx runs the decrement+insert sequence inside one tx. Mirrors
// checkout_service.Confirm. If any row's atomic UPDATE fails (insufficient
// stock or product gone inactive), the tx rolls back and the caller retries.
func insertOrderTx(
	ctx context.Context, pool *pgxpool.Pool,
	code string, cust struct {
		id       uuid.UUID
		address  string
		lat, lng float64
		phone    *string
	},
	branch struct {
		id       uuid.UUID
		lat, lng float64
	},
	items []seedOrderItem,
	subtotal, shippingFee, total decimal.Decimal,
	distKm float64, placedAt time.Time,
) error {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// 1. Atomic decrement per item. If 0 rows affected → race lost.
	for _, it := range items {
		tag, err := tx.Exec(ctx, `
			UPDATE product.branch_products
			SET quantity = quantity - $3, updated_at = NOW()
			WHERE branch_id = $1 AND product_id = $2 AND quantity >= $3 AND is_active = TRUE`,
			branch.id, it.productID, it.qty)
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			return fmt.Errorf("stock race lost on %s", it.productID)
		}
	}

	// 2. Insert order. routing_reason mirrors the live routing policy.
	routingReason := "nearest_eligible"
	lat := cust.lat
	lng := cust.lng
	var orderID uuid.UUID
	err = tx.QueryRow(ctx, `
		INSERT INTO orders.orders
		   (code, user_id, branch_id, subtotal, discount_total, shipping_fee, total,
		    shipping_address, shipping_latitude, shipping_longitude,
		    contact_phone, note, routing_reason, placed_at)
		VALUES ($1,$2,$3,$4,0,$5,$6,$7,$8,$9,$10,NULL,$11,$12)
		RETURNING id`,
		code, cust.id, branch.id, subtotal, shippingFee, total,
		cust.address, &lat, &lng, cust.phone, routingReason, placedAt,
	).Scan(&orderID)
	if err != nil {
		return err
	}

	// 3. Insert items with name + price snapshots.
	for _, it := range items {
		line := it.price.Mul(decimal.NewFromInt32(it.qty))
		if _, err := tx.Exec(ctx, `
			INSERT INTO orders.order_items
			   (order_id, product_id, name_snap, unit_price_snap, quantity, line_total)
			VALUES ($1, $2, $3, $4, $5, $6)`,
			orderID, it.productID, it.name, it.price, it.qty, line,
		); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

// haversineKmDemo + tierFeeDemo mirror internal/branch/service/routing_service
// so seeded orders match what live routing would have produced. Duplicating
// the constants here keeps the seed self-contained — if shipping policy
// changes in the routing service, update both.
func haversineKmDemo(lat1, lng1, lat2, lng2 float64) float64 {
	const r = 6371.0
	toRad := func(x float64) float64 { return x * math.Pi / 180 }
	dLat := toRad(lat2 - lat1)
	dLng := toRad(lng2 - lng1)
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(toRad(lat1))*math.Cos(toRad(lat2))*math.Sin(dLng/2)*math.Sin(dLng/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return r * c
}

func tierFeeDemo(distanceKm float64) int {
	switch {
	case distanceKm <= 3.0:
		return 15000
	case distanceKm <= 7.0:
		return 25000
	default:
		return 40000
	}
}

const codeAlphabetDemo = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

func genOrderCodeDemo(now time.Time) (string, error) {
	buf := make([]byte, 6)
	if _, err := cryptoRand.Read(buf); err != nil {
		return "", err
	}
	suffix := make([]byte, 6)
	for i, b := range buf {
		suffix[i] = codeAlphabetDemo[int(b)%len(codeAlphabetDemo)]
	}
	return fmt.Sprintf("BKO-%s-%s", now.UTC().Format("20060102"), string(suffix)), nil
}

// ─────────────────────────────────────────────────────────────────────────────
// HTTP handler — POST /admin/seed-demo (super_admin only)
// ─────────────────────────────────────────────────────────────────────────────

type devHandler struct {
	mods *modules
	pool *pgxpool.Pool
}

func newDevHandler(mods *modules, pool *pgxpool.Pool) *devHandler {
	return &devHandler{mods: mods, pool: pool}
}

// SeedDemo godoc
// @Summary      Seed sample data (admin)
// @Description  Populates branches, categories, products, customers, and staff for manual API testing. Idempotent: if any branch exists, the call is a no-op and `skipped` is true. Super-admin only.
// @Tags         dev
// @Security     BearerAuth
// @Produce      json
// @Success      200  {object}  SeedDemoSummary
// @Failure      403  {object}  response.ErrorResponse
// @Router       /admin/seed-demo [post]
func (h *devHandler) SeedDemo(c *gin.Context) {
	summary := seedDemoData(c.Request.Context(), h.mods, h.pool)
	response.Success(c, http.StatusOK, summary)
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

// slugifyDemo lowercases and replaces non-alphanumerics with single dashes.
func slugifyDemo(s string) string {
	out := make([]byte, 0, len(s))
	prevDash := false
	for i := 0; i < len(s); i++ {
		c := s[i]
		switch {
		case c >= 'A' && c <= 'Z':
			out = append(out, c+32)
			prevDash = false
		case c >= 'a' && c <= 'z', c >= '0' && c <= '9':
			out = append(out, c)
			prevDash = false
		default:
			if !prevDash && len(out) > 0 {
				out = append(out, '-')
				prevDash = true
			}
		}
	}
	for len(out) > 0 && out[len(out)-1] == '-' {
		out = out[:len(out)-1]
	}
	return string(out)
}
