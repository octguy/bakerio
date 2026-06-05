-- name: ListProductStats :many
-- Per-product breakdown sorted by revenue desc. LEFT JOINs preserve products
-- that have never sold (qty_sold=0, revenue=0) and products inactive at every
-- branch (branches_active=0, total_stock=0).
SELECT
    p.id, p.name, p.slug, p.price,
    COALESCE(s.qty_sold, 0)::bigint        AS qty_sold,
    COALESCE(s.revenue, 0)::numeric        AS revenue,
    COALESCE(b.branches_active, 0)::bigint AS branches_active,
    COALESCE(b.total_stock, 0)::bigint     AS total_stock
FROM product.products p
LEFT JOIN (
    SELECT product_id,
           SUM(quantity)   AS qty_sold,
           SUM(line_total) AS revenue
    FROM orders.order_items
    GROUP BY product_id
) s ON s.product_id = p.id
LEFT JOIN (
    SELECT product_id,
           COUNT(*) FILTER (WHERE is_active) AS branches_active,
           SUM(quantity)                     AS total_stock
    FROM product.branch_products
    GROUP BY product_id
) b ON b.product_id = p.id
WHERE p.deleted_at IS NULL
ORDER BY COALESCE(s.revenue, 0) DESC, p.name ASC
LIMIT $1 OFFSET $2;

-- name: CountProductStats :one
SELECT COUNT(*) FROM product.products WHERE deleted_at IS NULL;
