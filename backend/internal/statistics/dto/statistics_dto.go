package dto

import (
	"github.com/google/uuid"
	"github.com/shopspring/decimal"

	"github.com/octguy/bakerio/backend/pkg/pagination"
)

// ─────────────────────────────────────────────────────────────────────────────
// GET /statistics/overview
// ─────────────────────────────────────────────────────────────────────────────

// OverviewStats is the super_admin landing-page KPI bundle. Money is raw VND
// (decimal as string in JSON), counts are int64.
type OverviewStats struct {
	TotalCustomers   int64           `json:"total_customers"`
	TotalBranches    int64           `json:"total_branches"`
	TotalProducts    int64           `json:"total_products"`
	TotalOrders      int64           `json:"total_orders"`
	TotalRevenue     decimal.Decimal `json:"total_revenue"`
	TotalDiscount    decimal.Decimal `json:"total_discount"`
	VouchersRedeemed int64           `json:"vouchers_redeemed"`
	TierBronze       int64           `json:"tier_bronze"`
	TierSilver       int64           `json:"tier_silver"`
	TierGold         int64           `json:"tier_gold"`
} // @name OverviewStats

// ─────────────────────────────────────────────────────────────────────────────
// GET /statistics/branches
// ─────────────────────────────────────────────────────────────────────────────

type BranchStat struct {
	BranchID       uuid.UUID       `json:"branch_id"`
	BranchName     string          `json:"branch_name"`
	OrderCount     int64           `json:"order_count"`
	Revenue        decimal.Decimal `json:"revenue"`
	StaffCount     int64           `json:"staff_count"`
	ActiveProducts int64           `json:"active_products"`
} // @name BranchStat

type BranchStatsResponse struct {
	Items []BranchStat `json:"items"`
} // @name BranchStatsResponse

// ─────────────────────────────────────────────────────────────────────────────
// GET /statistics/branches/:id
// ─────────────────────────────────────────────────────────────────────────────

// PeriodTotals groups orders + revenue for one calendar-aligned period.
// Reused by today / this week / this month buckets.
type PeriodTotals struct {
	Orders  int64           `json:"orders"`
	Revenue decimal.Decimal `json:"revenue"`
} // @name PeriodTotals

// BranchTopProduct is a row of the top-5 sellers list for a branch.
type BranchTopProduct struct {
	ProductID uuid.UUID       `json:"product_id"`
	Name      string          `json:"name"`
	QtySold   int64           `json:"qty_sold"`
	Revenue   decimal.Decimal `json:"revenue"`
} // @name BranchTopProduct

// BranchDetailStats is the per-branch dashboard. Calendar-aligned periods
// are in Asia/Ho_Chi_Minh — see SQL.
type BranchDetailStats struct {
	BranchID        uuid.UUID          `json:"branch_id"`
	BranchName      string             `json:"branch_name"`
	StaffCount      int64              `json:"staff_count"`
	ActiveProducts  int64              `json:"active_products"`
	UniqueCustomers int64              `json:"unique_customers"`
	Today           PeriodTotals       `json:"today"`
	ThisWeek        PeriodTotals       `json:"this_week"`
	ThisMonth       PeriodTotals       `json:"this_month"`
	AllTime         PeriodTotals       `json:"all_time"`
	TopProducts     []BranchTopProduct `json:"top_products"`
} // @name BranchDetailStats

// ─────────────────────────────────────────────────────────────────────────────
// GET /statistics/products
// ─────────────────────────────────────────────────────────────────────────────

type ProductStat struct {
	ID             uuid.UUID       `json:"id"`
	Name           string          `json:"name"`
	Slug           string          `json:"slug"`
	Price          decimal.Decimal `json:"price"`
	QtySold        int64           `json:"qty_sold"`
	Revenue        decimal.Decimal `json:"revenue"`
	BranchesActive int64           `json:"branches_active"`
	TotalStock     int64           `json:"total_stock"`
} // @name ProductStat

type ProductStatsResponse struct {
	Items []ProductStat `json:"items"`
	pagination.Meta
} // @name ProductStatsResponse
