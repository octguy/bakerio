package main

import (
	"context"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/octguy/bakerio/backend/internal/platform/logger"
	"github.com/octguy/bakerio/backend/internal/shared/authcontext"
	"github.com/octguy/bakerio/backend/internal/shared/response"
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
