-- name: FanoutProductToBranches :exec
-- On product create: insert one row per branch, inactive (opt-in).
INSERT INTO product.branch_products (product_id, branch_id, created_by, updated_by)
SELECT $1, b, $3, $3
FROM unnest($2::uuid[]) AS b
ON CONFLICT (product_id, branch_id) DO NOTHING;

-- name: SeedBranchProducts :exec
-- On branch create: insert a row for every existing product, inactive (opt-in).
INSERT INTO product.branch_products (product_id, branch_id, created_by, updated_by)
SELECT p.id, $1, $2, $2
FROM product.products p
WHERE p.deleted_at IS NULL
ON CONFLICT (product_id, branch_id) DO NOTHING;

-- name: GetBranchProduct :one
SELECT * FROM product.branch_products
WHERE product_id = $1 AND branch_id = $2;

-- name: UpdateBranchProduct :one
-- Patch availability and/or quantity at a branch. The boolean "set_*" flags
-- pick whether the corresponding column is overwritten or left as-is, so the
-- same endpoint covers toggle-only, set-stock-only, or both at once.
UPDATE product.branch_products
SET is_active  = CASE WHEN sqlc.arg('set_active')::boolean
                      THEN sqlc.arg('is_active')::boolean
                      ELSE is_active END,
    quantity   = CASE WHEN sqlc.arg('set_quantity')::boolean
                      THEN sqlc.arg('quantity')::int4
                      ELSE quantity END,
    updated_at = NOW(),
    updated_by = sqlc.arg('updated_by')
WHERE product_id = $1 AND branch_id = $2
RETURNING *;

-- name: ListBranchProductsByBranch :many
-- Admin/manager matrix view: every product's availability at a branch.
SELECT * FROM product.branch_products
WHERE branch_id = $1;

-- name: ListActiveProductsByBranch :many
-- Customer-facing: products sellable at a branch (both flags true).
SELECT p.* FROM product.products p
JOIN product.branch_products bp ON bp.product_id = p.id
WHERE bp.branch_id = $1
  AND bp.is_active = TRUE
  AND p.is_active = TRUE
  AND p.deleted_at IS NULL
ORDER BY p.sort_order ASC, p.name ASC;

-- name: ReadBranchStock :many
-- Non-locking pre-check used by order/confirm to build a rich
-- STOCK_CONFLICT payload (report all problematic items at once instead of
-- one-at-a-time across retries). The atomic UPDATE in DecrementBranchStock
-- is what actually enforces the invariant — this SELECT is informational.
SELECT product_id, quantity, is_active
FROM product.branch_products
WHERE branch_id = $1 AND product_id = ANY($2::uuid[]);

-- name: DecrementBranchStock :execrows
-- Atomic subtract — fires only when current stock is enough AND the row is
-- still active. Returns rows-affected (1 = success, 0 = lost the race or
-- product deactivated). Service uses the count to detect failure and roll
-- back the entire tx.
UPDATE product.branch_products
SET quantity   = quantity - $3,
    updated_at = NOW()
WHERE branch_id = $1
  AND product_id = $2
  AND quantity >= $3
  AND is_active = TRUE;

-- name: GetProductsByIDs :many
-- Pulls live name + price for snapshotting onto the order session at
-- /orders/select-branch. Filters to active + undeleted; client must
-- handle a missing product as "stale catalog, refresh".
SELECT id, name, price
FROM product.products
WHERE id = ANY($1::uuid[])
  AND is_active = TRUE
  AND deleted_at IS NULL;
