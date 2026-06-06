-- name: GetOrderTimeseries :many
-- Chart-friendly time-series of orders.placed_at, parametric on granularity.
-- Buckets are calendar-aligned in Asia/Ho_Chi_Minh.
--
-- granularity is one of {day, week, month, year}. The handler whitelists the
-- string before it reaches SQL — never pass user input straight through.
--
-- generate_series gives one row per bucket inside [from_time, to_time],
-- which guarantees zero-filled output even on days with no orders. The
-- LEFT JOIN then sums the matching orders for each bucket. branch_id is
-- optional (NULL = all branches).
WITH params AS (
    SELECT
        sqlc.arg('granularity')::text     AS gran,
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
    b.bucket_start::timestamptz         AS bucket_start,
    COUNT(o.id)::bigint                 AS orders,
    COALESCE(SUM(o.total), 0)::numeric  AS revenue
FROM buckets b
CROSS JOIN params p
LEFT JOIN orders.orders o
    ON o.placed_at >= b.bucket_start
   AND o.placed_at <  b.bucket_start + ('1 ' || p.gran)::interval
   AND (p.bid IS NULL OR o.branch_id = p.bid)
GROUP BY b.bucket_start
ORDER BY b.bucket_start;
