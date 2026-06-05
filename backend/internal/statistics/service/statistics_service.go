package service

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	statisticsdb "github.com/octguy/bakerio/backend/db/sqlc/statistics"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
	"github.com/octguy/bakerio/backend/internal/statistics/dto"
	"github.com/octguy/bakerio/backend/pkg/pagination"
)

// TopProductsLimit is the fixed window for /statistics/branches/:id's top
// sellers list. Hardcoded since the spec calls for 5.
const TopProductsLimit = 5

// Service is the read-only statistics facade. No transactions — every method
// is a single SELECT (or a small bundle of independent SELECTs that don't
// need to be consistent with each other beyond eventual freshness).
type Service interface {
	GetOverview(ctx context.Context) (dto.OverviewStats, error)
	ListBranchStats(ctx context.Context) (dto.BranchStatsResponse, error)
	GetBranchDetail(ctx context.Context, branchID uuid.UUID) (dto.BranchDetailStats, error)
	ListProductStats(ctx context.Context, p pagination.Params) (dto.ProductStatsResponse, error)
}

type service struct {
	db *statisticsdb.Queries
}

func NewService(db *statisticsdb.Queries) Service {
	return &service{db: db}
}

// ─────────────────────────────────────────────────────────────────────────────

func (s *service) GetOverview(ctx context.Context) (dto.OverviewStats, error) {
	row, err := s.db.GetOverview(ctx)
	if err != nil {
		return dto.OverviewStats{}, apperrors.Internal("failed to load overview", err)
	}
	return dto.OverviewStats{
		TotalCustomers:   row.TotalCustomers,
		TotalBranches:    row.TotalBranches,
		TotalProducts:    row.TotalProducts,
		TotalOrders:      row.TotalOrders,
		TotalRevenue:     row.TotalRevenue,
		TotalDiscount:    row.TotalDiscount,
		VouchersRedeemed: row.VouchersRedeemed,
		TierBronze:       row.BronzeUsers,
		TierSilver:       row.SilverUsers,
		TierGold:         row.GoldUsers,
	}, nil
}

func (s *service) ListBranchStats(ctx context.Context) (dto.BranchStatsResponse, error) {
	rows, err := s.db.ListBranchStats(ctx)
	if err != nil {
		return dto.BranchStatsResponse{}, apperrors.Internal("failed to list branch stats", err)
	}
	items := make([]dto.BranchStat, len(rows))
	for i, r := range rows {
		items[i] = dto.BranchStat{
			BranchID:       r.BranchID,
			BranchName:     r.BranchName,
			OrderCount:     r.OrderCount,
			Revenue:        r.Revenue,
			StaffCount:     r.StaffCount,
			ActiveProducts: r.ActiveProducts,
		}
	}
	return dto.BranchStatsResponse{Items: items}, nil
}

func (s *service) GetBranchDetail(ctx context.Context, branchID uuid.UUID) (dto.BranchDetailStats, error) {
	side, err := s.db.GetBranchSideCounts(ctx, branchID)
	if err != nil {
		return dto.BranchDetailStats{}, apperrors.Internal("failed to load branch side counts", err)
	}
	if side.BranchName == "" {
		// COALESCE returns '' when the branch row doesn't exist. Surface as 404
		// so the handler can map cleanly.
		return dto.BranchDetailStats{}, apperrors.NotFound("branch not found")
	}

	kpis, err := s.db.GetBranchKPIs(ctx, branchID)
	if err != nil {
		return dto.BranchDetailStats{}, apperrors.Internal("failed to load branch KPIs", err)
	}

	topRows, err := s.db.ListTopProductsByBranch(ctx, statisticsdb.ListTopProductsByBranchParams{
		BranchID: branchID,
		Limit:    TopProductsLimit,
	})
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return dto.BranchDetailStats{}, apperrors.Internal("failed to load top products", err)
	}
	top := make([]dto.BranchTopProduct, len(topRows))
	for i, r := range topRows {
		top[i] = dto.BranchTopProduct{
			ProductID: r.ProductID,
			Name:      r.Name,
			QtySold:   r.QtySold,
			Revenue:   r.Revenue,
		}
	}

	return dto.BranchDetailStats{
		BranchID:        branchID,
		BranchName:      side.BranchName,
		StaffCount:      side.StaffCount,
		ActiveProducts:  side.ActiveProducts,
		UniqueCustomers: kpis.UniqueCustomers,
		Today:           dto.PeriodTotals{Orders: kpis.OrdersToday, Revenue: kpis.RevenueToday},
		ThisWeek:        dto.PeriodTotals{Orders: kpis.OrdersWeek, Revenue: kpis.RevenueWeek},
		ThisMonth:       dto.PeriodTotals{Orders: kpis.OrdersMonth, Revenue: kpis.RevenueMonth},
		AllTime:         dto.PeriodTotals{Orders: kpis.OrdersAll, Revenue: kpis.RevenueAll},
		TopProducts:     top,
	}, nil
}

func (s *service) ListProductStats(ctx context.Context, p pagination.Params) (dto.ProductStatsResponse, error) {
	rows, err := s.db.ListProductStats(ctx, statisticsdb.ListProductStatsParams{
		Limit:  int32(p.Size),
		Offset: int32(p.Offset()),
	})
	if err != nil {
		return dto.ProductStatsResponse{}, apperrors.Internal("failed to list product stats", err)
	}
	total, err := s.db.CountProductStats(ctx)
	if err != nil {
		return dto.ProductStatsResponse{}, apperrors.Internal("failed to count products", err)
	}

	items := make([]dto.ProductStat, len(rows))
	for i, r := range rows {
		items[i] = dto.ProductStat{
			ID:             r.ID,
			Name:           r.Name,
			Slug:           r.Slug,
			Price:          r.Price,
			QtySold:        r.QtySold,
			Revenue:        r.Revenue,
			BranchesActive: r.BranchesActive,
			TotalStock:     r.TotalStock,
		}
	}
	return dto.ProductStatsResponse{
		Items: items,
		Meta:  pagination.NewMeta(p, total),
	}, nil
}
