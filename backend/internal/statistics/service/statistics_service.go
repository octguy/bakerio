package service

import (
	"context"
	"errors"
	"time"

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

// Timeseries granularity values + bucket caps. The caps protect the API from
// "give me daily data for 50 years" requests; over → 422 with a
// "narrow your range" message.
const (
	GranDay   = "day"
	GranWeek  = "week"
	GranMonth = "month"
	GranYear  = "year"

	maxBucketsDay   = 365
	maxBucketsWeek  = 53
	maxBucketsMonth = 60
	maxBucketsYear  = 20
)

// Service is the read-only statistics facade. No transactions — every method
// is a single SELECT (or a small bundle of independent SELECTs that don't
// need to be consistent with each other beyond eventual freshness).
type Service interface {
	GetOverview(ctx context.Context) (dto.OverviewStats, error)
	ListBranchStats(ctx context.Context) (dto.BranchStatsResponse, error)
	GetBranchDetail(ctx context.Context, branchID uuid.UUID) (dto.BranchDetailStats, error)
	ListProductStats(ctx context.Context, p pagination.Params) (dto.ProductStatsResponse, error)
	GetTimeseries(ctx context.Context, q TimeseriesQuery) (dto.TimeseriesResponse, error)
	GetProductTimeseries(ctx context.Context, productID uuid.UUID, q TimeseriesQuery) (dto.ProductTimeseriesResponse, error)
}

// TimeseriesQuery is the resolved-and-validated input. Handler does scope
// resolution before constructing this; service does defaulting + capping.
type TimeseriesQuery struct {
	Granularity string     // raw — gets whitelist-validated in the service
	From        *time.Time // nil → defaulted per granularity
	To          *time.Time // nil → "now" (end of current bucket)
	BranchID    *uuid.UUID // nil → all branches
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

// ─────────────────────────────────────────────────────────────────────────────

func (s *service) GetTimeseries(ctx context.Context, q TimeseriesQuery) (dto.TimeseriesResponse, error) {
	gran := q.Granularity
	if !isValidGranularity(gran) {
		return dto.TimeseriesResponse{}, apperrors.Validation("granularity must be one of: day, week, month, year")
	}

	to := time.Now()
	if q.To != nil {
		to = *q.To
	}
	from := defaultFrom(gran, to)
	if q.From != nil {
		from = *q.From
	}
	if !from.Before(to) {
		return dto.TimeseriesResponse{}, apperrors.Validation("`from` must be earlier than `to`")
	}
	if buckets := estimateBuckets(gran, from, to); buckets > maxBuckets(gran) {
		return dto.TimeseriesResponse{}, apperrors.Validation(
			"requested range yields too many buckets — narrow `from`/`to` or pick a coarser granularity",
		)
	}

	rows, err := s.db.GetOrderTimeseries(ctx, statisticsdb.GetOrderTimeseriesParams{
		Granularity: gran,
		FromTime:    from,
		ToTime:      to,
		BranchID:    q.BranchID,
	})
	if err != nil {
		return dto.TimeseriesResponse{}, apperrors.Internal("failed to load timeseries", err)
	}

	points := make([]dto.TimeseriesPoint, len(rows))
	for i, r := range rows {
		points[i] = dto.TimeseriesPoint{
			BucketStart: r.BucketStart,
			Orders:      r.Orders,
			Revenue:     r.Revenue,
		}
	}
	return dto.TimeseriesResponse{
		Granularity: gran,
		From:        from,
		To:          to,
		BranchID:    q.BranchID,
		Points:      points,
	}, nil
}

func (s *service) GetProductTimeseries(ctx context.Context, productID uuid.UUID, q TimeseriesQuery) (dto.ProductTimeseriesResponse, error) {
	// Look up the product first — gives us the name to echo back and lets us
	// 404 cleanly when the id doesn't exist or has been soft-deleted, before
	// the heavier timeseries query runs.
	name, err := s.db.GetProductName(ctx, productID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return dto.ProductTimeseriesResponse{}, apperrors.NotFound("product not found")
		}
		return dto.ProductTimeseriesResponse{}, apperrors.Internal("failed to load product", err)
	}

	gran := q.Granularity
	if !isValidGranularity(gran) {
		return dto.ProductTimeseriesResponse{}, apperrors.Validation("granularity must be one of: day, week, month, year")
	}

	to := time.Now()
	if q.To != nil {
		to = *q.To
	}
	from := defaultFrom(gran, to)
	if q.From != nil {
		from = *q.From
	}
	if !from.Before(to) {
		return dto.ProductTimeseriesResponse{}, apperrors.Validation("`from` must be earlier than `to`")
	}
	if buckets := estimateBuckets(gran, from, to); buckets > maxBuckets(gran) {
		return dto.ProductTimeseriesResponse{}, apperrors.Validation(
			"requested range yields too many buckets — narrow `from`/`to` or pick a coarser granularity",
		)
	}

	rows, err := s.db.GetProductTimeseries(ctx, statisticsdb.GetProductTimeseriesParams{
		Granularity: gran,
		ProductID:   productID,
		FromTime:    from,
		ToTime:      to,
		BranchID:    q.BranchID,
	})
	if err != nil {
		return dto.ProductTimeseriesResponse{}, apperrors.Internal("failed to load product timeseries", err)
	}

	points := make([]dto.ProductTimeseriesPoint, len(rows))
	for i, r := range rows {
		points[i] = dto.ProductTimeseriesPoint{
			BucketStart: r.BucketStart,
			QtySold:     r.QtySold,
			Revenue:     r.Revenue,
		}
	}
	return dto.ProductTimeseriesResponse{
		ProductID:   productID,
		ProductName: name,
		Granularity: gran,
		From:        from,
		To:          to,
		BranchID:    q.BranchID,
		Points:      points,
	}, nil
}

func isValidGranularity(g string) bool {
	switch g {
	case GranDay, GranWeek, GranMonth, GranYear:
		return true
	}
	return false
}

// defaultFrom returns the from-date when the caller omits it: ~one chart's
// worth of history at the requested granularity. Picked to give the frontend
// useful data without forcing it to specify a range every time.
func defaultFrom(gran string, to time.Time) time.Time {
	switch gran {
	case GranDay:
		return to.AddDate(0, 0, -30)
	case GranWeek:
		return to.AddDate(0, 0, -7*12)
	case GranMonth:
		return to.AddDate(0, -12, 0)
	case GranYear:
		return to.AddDate(-5, 0, 0)
	}
	return to.AddDate(0, 0, -30)
}

// estimateBuckets is a conservative upper bound; the actual SQL bucket count
// depends on calendar alignment but never exceeds this. Cheaper than running
// the query and counting.
func estimateBuckets(gran string, from, to time.Time) int {
	d := to.Sub(from)
	switch gran {
	case GranDay:
		return int(d.Hours()/24) + 1
	case GranWeek:
		return int(d.Hours()/(24*7)) + 1
	case GranMonth:
		// 30.44 ≈ average days per month.
		return int(d.Hours()/(24*30.44)) + 2
	case GranYear:
		return int(d.Hours()/(24*365.25)) + 2
	}
	return 0
}

func maxBuckets(gran string) int {
	switch gran {
	case GranDay:
		return maxBucketsDay
	case GranWeek:
		return maxBucketsWeek
	case GranMonth:
		return maxBucketsMonth
	case GranYear:
		return maxBucketsYear
	}
	return 0
}
