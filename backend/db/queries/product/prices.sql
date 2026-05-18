-- name: SetProductPrice :one
INSERT INTO product.product_prices (
    product_id, branch_id, price, created_by, updated_by
) VALUES (
    $1, $2, $3, $4, $5
)
ON CONFLICT (product_id, branch_id) DO UPDATE
SET 
    price = EXCLUDED.price,
    updated_at = NOW(),
    updated_by = EXCLUDED.updated_by,
    deleted_at = NULL
RETURNING *;

-- name: GetPriceByBranch :one
SELECT * FROM product.product_prices
WHERE product_id = $1 AND branch_id = $2 AND deleted_at IS NULL;

-- name: ListPricesByBranch :many
SELECT pp.*, p.name as product_name
FROM product.product_prices pp
JOIN product.products p ON pp.product_id = p.id
WHERE pp.branch_id = $1 AND pp.deleted_at IS NULL AND p.deleted_at IS NULL;

-- name: DeleteProductPrice :exec
UPDATE product.product_prices
SET 
    deleted_at = NOW(),
    updated_by = $2
WHERE product_id = $1 AND branch_id = $3;

-- name: InsertPriceHistory :one
INSERT INTO product.product_price_history (
    product_id, branch_id, price, changed_by
) VALUES (
    $1, $2, $3, $4
) RETURNING *;

-- name: ListPriceHistory :many
SELECT h.*, u.email as changed_by_email
FROM product.product_price_history h
LEFT JOIN auth.users u ON h.changed_by = u.id
WHERE h.product_id = $1
ORDER BY h.effective_at DESC;
