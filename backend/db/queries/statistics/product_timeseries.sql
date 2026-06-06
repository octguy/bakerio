-- name: GetProductTimeseries :many
-- Chart-friendly time-series of units sold (and revenue) for ONE product.
-- Same shape + zero-fill behavior as GetOrderTimeseries, but aggregates over
-- orders.order_items filtered by product_id. branch_id is optional —
-- branch_manager callers will have it forced to their own; admin/product
-- manager can omit it for all-branches numbers.
WITH params AS (
    SELECT
        sqlc.arg('granularity')::text      AS gran,
        sqlc.arg('product_id')::uuid       AS pid,
        sqlc.arg('from_time')::timestamptz AS from_t,
        sqlc.arg('to_time')::timestamptz   AS to_t,
        sqlc.narg('branch_id')::uuid       AS bid
),
buckets AS (
    SELECT generate_series(
        date_trunc(p.gran, p.from_t AT TIME ZONE 'Asia/Ho_Chi_Minh')
            AT TIME ZONE 'Asia/Ho_Chi_Minh',
        date_trunc(p.gran, p.to_t   AT TIME ZONE 'Asia/Ho_Chi_Minh')
            AT TIME ZONE 'Asia/Ho_Chi_Minh',
        ('1 ' || p.gran)::interval
    ) AS bucket_start
    FROM params p
)
SELECT
    b.bucket_start::timestamptz             AS bucket_start,
    COALESCE(SUM(oi.quantity),   0)::bigint AS qty_sold,
    COALESCE(SUM(oi.line_total), 0)::numeric AS revenue
FROM buckets b
CROSS JOIN params p
LEFT JOIN orders.orders o
    ON o.placed_at >= b.bucket_start
   AND o.placed_at <  b.bucket_start + ('1 ' || p.gran)::interval
   AND (p.bid IS NULL OR o.branch_id = p.bid)
LEFT JOIN orders.order_items oi
    ON oi.order_id   = o.id
   AND oi.product_id = p.pid
GROUP BY b.bucket_start
ORDER BY b.bucket_start;
