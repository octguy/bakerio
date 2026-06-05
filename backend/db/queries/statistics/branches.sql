-- name: ListBranchStats :many
-- All branches with aggregated KPIs. LEFT JOINs preserve branches with no
-- orders / no staff / no active products (they show as 0).
SELECT
    b.id                                AS branch_id,
    b.name                              AS branch_name,
    COALESCE(o.order_count, 0)::bigint  AS order_count,
    COALESCE(o.revenue, 0)::numeric     AS revenue,
    COALESCE(s.staff_count, 0)::bigint  AS staff_count,
    COALESCE(bp.active_products, 0)::bigint AS active_products
FROM branch.branches b
LEFT JOIN (
    SELECT branch_id,
           COUNT(*)   AS order_count,
           SUM(total) AS revenue
    FROM orders.orders
    GROUP BY branch_id
) o ON o.branch_id = b.id
LEFT JOIN (
    SELECT branch_id, COUNT(*) AS staff_count
    FROM branch.branch_memberships
    GROUP BY branch_id
) s ON s.branch_id = b.id
LEFT JOIN (
    SELECT branch_id, COUNT(*) AS active_products
    FROM product.branch_products
    WHERE is_active = TRUE
    GROUP BY branch_id
) bp ON bp.branch_id = b.id
ORDER BY COALESCE(o.revenue, 0) DESC, b.name ASC;

-- name: GetBranchKPIs :one
-- Single branch counters bundled with the calendar-aligned period filters
-- (today / this week / this month, in Asia/Ho_Chi_Minh). The conversion
-- pattern is: now() AT TIME ZONE → date_trunc → AT TIME ZONE, which produces
-- a TIMESTAMPTZ at local-midnight that's directly comparable with placed_at.
SELECT
    COUNT(*) FILTER (
        WHERE placed_at >= date_trunc('day',
              now() AT TIME ZONE 'Asia/Ho_Chi_Minh') AT TIME ZONE 'Asia/Ho_Chi_Minh'
    )::bigint AS orders_today,
    COALESCE(SUM(total) FILTER (
        WHERE placed_at >= date_trunc('day',
              now() AT TIME ZONE 'Asia/Ho_Chi_Minh') AT TIME ZONE 'Asia/Ho_Chi_Minh'
    ), 0)::numeric AS revenue_today,

    COUNT(*) FILTER (
        WHERE placed_at >= date_trunc('week',
              now() AT TIME ZONE 'Asia/Ho_Chi_Minh') AT TIME ZONE 'Asia/Ho_Chi_Minh'
    )::bigint AS orders_week,
    COALESCE(SUM(total) FILTER (
        WHERE placed_at >= date_trunc('week',
              now() AT TIME ZONE 'Asia/Ho_Chi_Minh') AT TIME ZONE 'Asia/Ho_Chi_Minh'
    ), 0)::numeric AS revenue_week,

    COUNT(*) FILTER (
        WHERE placed_at >= date_trunc('month',
              now() AT TIME ZONE 'Asia/Ho_Chi_Minh') AT TIME ZONE 'Asia/Ho_Chi_Minh'
    )::bigint AS orders_month,
    COALESCE(SUM(total) FILTER (
        WHERE placed_at >= date_trunc('month',
              now() AT TIME ZONE 'Asia/Ho_Chi_Minh') AT TIME ZONE 'Asia/Ho_Chi_Minh'
    ), 0)::numeric AS revenue_month,

    COUNT(*)::bigint                              AS orders_all,
    COALESCE(SUM(total), 0)::numeric              AS revenue_all,
    COUNT(DISTINCT user_id)::bigint               AS unique_customers
FROM orders.orders
WHERE branch_id = $1;

-- name: GetBranchSideCounts :one
-- Slow-changing counts paired with the KPI bundle. Same row count regardless
-- of order volume so it can sit next to the more dynamic numbers.
SELECT
    COALESCE((SELECT b.name FROM branch.branches b WHERE b.id = $1), '')::text AS branch_name,
    (SELECT COUNT(*) FROM branch.branch_memberships
        WHERE branch_id = $1)::bigint AS staff_count,
    (SELECT COUNT(*) FROM product.branch_products
        WHERE branch_id = $1 AND is_active = TRUE)::bigint AS active_products;

-- name: ListTopProductsByBranch :many
-- Top sellers at one branch by revenue. name_snap is the historical name on
-- the order line (so renamed-since-sold products still show under their
-- original name, which is what the customer saw).
SELECT
    oi.product_id,
    oi.name_snap                AS name,
    SUM(oi.quantity)::bigint    AS qty_sold,
    SUM(oi.line_total)::numeric AS revenue
FROM orders.orders o
JOIN orders.order_items oi ON oi.order_id = o.id
WHERE o.branch_id = $1
GROUP BY oi.product_id, oi.name_snap
ORDER BY revenue DESC
LIMIT $2;
