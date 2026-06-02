package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"
)

// RoutingRepository runs the cross-schema reads behind /orders/find-branches.
// This is an accepted exception to the schema-per-module rule (reads only,
// no writes). The branch module owns this read because the routing query is
// anchored on branch.branches (status + lat/lng) and only secondarily checks
// product.branch_products for stock.
type RoutingRepository interface {
	// EligibleBranches returns the rows for the routing endpoint along with
	// the cart subtotal computed from the live product prices. When the
	// cart can't be fully fulfilled by any single branch, returns
	// (subtotal, nil, nil) — callers should then call MissingItems.
	EligibleBranches(ctx context.Context, productIDs []uuid.UUID, quantities []int32) (decimal.Decimal, []RoutingBranchRow, error)
	// MissingItems explains which of the requested items can't be fulfilled
	// in the requested quantity by ANY active branch — used to populate the
	// 422 response payload so the UI can highlight cart rows.
	MissingItems(ctx context.Context, productIDs []uuid.UUID, quantities []int32) ([]MissingItemRow, error)
}

// RoutingBranchRow is what EligibleBranches returns. Public so the service
// can consume it without a cycle through the service package's types.
type RoutingBranchRow struct {
	BranchID uuid.UUID
	Name     string
	Address  string
	Lat      float64
	Lng      float64
}

// MissingItemRow is the repo-level shape; the service maps it to the public
// MissingItem the order module sees.
type MissingItemRow struct {
	ProductID    uuid.UUID
	Name         string
	Requested    int32
	MaxAvailable int32
}

type routingRepo struct {
	pool *pgxpool.Pool
}

func NewRoutingRepository(pool *pgxpool.Pool) RoutingRepository {
	return &routingRepo{pool: pool}
}

func (r *routingRepo) EligibleBranches(ctx context.Context, productIDs []uuid.UUID, quantities []int32) (decimal.Decimal, []RoutingBranchRow, error) {
	// Subtotal first — same for every branch (prices are product-wide).
	// Calculated against the live product price column; never trust client.
	var subtotal decimal.Decimal
	subtotalSQL := `
		SELECT COALESCE(SUM(p.price * r.qty), 0)
		FROM unnest($1::uuid[], $2::int[]) AS r(product_id, qty)
		JOIN product.products p ON p.id = r.product_id
		WHERE p.is_active = TRUE
		`
	if err := r.pool.QueryRow(ctx, subtotalSQL, productIDs, quantities).Scan(&subtotal); err != nil {
		return decimal.Zero, nil, err
	}

	// Eligibility: a branch is "in" if it has every requested item active
	// AND in stock >= requested. The HAVING COUNT(*) trick assumes each
	// product_id appears at most once in the input — the caller is expected
	// to merge duplicate items before sending.
	rowsSQL := `
		WITH requested AS (
		    SELECT * FROM unnest($1::uuid[], $2::int[]) AS t(product_id, qty)
		), eligible AS (
		    SELECT bp.branch_id
		    FROM product.branch_products bp
		    JOIN requested r ON r.product_id = bp.product_id
		    WHERE bp.is_active = TRUE AND bp.quantity >= r.qty
		    GROUP BY bp.branch_id
		    HAVING COUNT(*) = (SELECT COUNT(*) FROM requested)
		)
		SELECT b.id, b.name, b.address,
		       COALESCE(b.lat, 0), COALESCE(b.lng, 0)
		FROM branch.branches b
		JOIN eligible e ON e.branch_id = b.id
		WHERE b.status = 'active'
		  AND b.lat IS NOT NULL
		  AND b.lng IS NOT NULL`
	rows, err := r.pool.Query(ctx, rowsSQL, productIDs, quantities)
	if err != nil {
		return subtotal, nil, err
	}
	defer rows.Close()

	var out []RoutingBranchRow
	for rows.Next() {
		var row RoutingBranchRow
		if err := rows.Scan(&row.BranchID, &row.Name, &row.Address, &row.Lat, &row.Lng); err != nil {
			return subtotal, nil, err
		}
		out = append(out, row)
	}
	return subtotal, out, rows.Err()
}

func (r *routingRepo) MissingItems(ctx context.Context, productIDs []uuid.UUID, quantities []int32) ([]MissingItemRow, error) {
	sql := `
		WITH requested AS (
		    SELECT * FROM unnest($1::uuid[], $2::int[]) AS t(product_id, qty)
		), max_avail AS (
		    SELECT bp.product_id, MAX(bp.quantity) AS max_qty
		    FROM product.branch_products bp
		    WHERE bp.is_active = TRUE
		      AND bp.product_id IN (SELECT product_id FROM requested)
		    GROUP BY bp.product_id
		)
		SELECT r.product_id,
		       COALESCE(p.name, ''),
		       r.qty,
		       COALESCE(m.max_qty, 0)
		FROM requested r
		LEFT JOIN max_avail m  ON m.product_id = r.product_id
		LEFT JOIN product.products p ON p.id = r.product_id
		WHERE COALESCE(m.max_qty, 0) < r.qty`
	rows, err := r.pool.Query(ctx, sql, productIDs, quantities)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []MissingItemRow
	for rows.Next() {
		var m MissingItemRow
		if err := rows.Scan(&m.ProductID, &m.Name, &m.Requested, &m.MaxAvailable); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}
