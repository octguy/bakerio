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

-- name: SetBranchProductActive :one
UPDATE product.branch_products
SET is_active  = $3,
    updated_at = NOW(),
    updated_by = $4
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
