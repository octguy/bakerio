-- name: CreateProduct :one
INSERT INTO product.products (
    name, slug, category_id, price, sort_order, created_by, updated_by
) VALUES (
    $1, $2, $3, $4, $5, $6, $6
) RETURNING *;

-- name: GetProductByID :one
SELECT * FROM product.products
WHERE id = $1 AND deleted_at IS NULL;

-- name: GetProductBySlug :one
SELECT * FROM product.products
WHERE slug = $1 AND deleted_at IS NULL;

-- name: ListProducts :many
SELECT * FROM product.products
WHERE deleted_at IS NULL
ORDER BY sort_order ASC, name ASC
LIMIT $1 OFFSET $2;

-- name: CountProducts :one
SELECT COUNT(*) FROM product.products
WHERE deleted_at IS NULL;

-- name: ListProductsByCategory :many
SELECT * FROM product.products
WHERE deleted_at IS NULL AND category_id = $1
ORDER BY sort_order ASC, name ASC
LIMIT $2 OFFSET $3;

-- name: CountProductsByCategory :one
SELECT COUNT(*) FROM product.products
WHERE deleted_at IS NULL AND category_id = $1;

-- name: ListProductsByCategorySlug :many
SELECT p.* FROM product.products p
JOIN product.categories c ON p.category_id = c.id
WHERE p.deleted_at IS NULL AND c.slug = $1
ORDER BY p.sort_order ASC, p.name ASC
LIMIT $2 OFFSET $3;

-- name: CountProductsByCategorySlug :one
SELECT COUNT(*) FROM product.products p
JOIN product.categories c ON p.category_id = c.id
WHERE p.deleted_at IS NULL AND c.slug = $1;

-- name: UpdateProduct :one
UPDATE product.products
SET
    name        = $2,
    slug        = $3,
    category_id = $4,
    price       = $5,
    sort_order  = $6,
    is_active   = $7,
    updated_at  = NOW(),
    updated_by  = $8
WHERE id = $1 AND deleted_at IS NULL
RETURNING *;

-- name: SoftDeleteProduct :exec
UPDATE product.products
SET deleted_at = NOW(),
    updated_by = $2
WHERE id = $1;

-- name: GetActiveProductsByIDs :many
-- For cart/order to validate and snapshot products.
SELECT * FROM product.products
WHERE id = ANY($1::uuid[]) AND is_active = TRUE AND deleted_at IS NULL;
