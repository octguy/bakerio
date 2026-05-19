-- name: CreateProduct :one
INSERT INTO product.products (
    sku, name, slug, description, category_id, unit, created_by, updated_by
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8
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
ORDER BY name ASC;

-- name: ListProductsByCategory :many
SELECT * FROM product.products
WHERE category_id = $1 AND deleted_at IS NULL
ORDER BY name ASC;

-- name: UpdateProduct :one
UPDATE product.products
SET 
    sku = $2,
    name = $3,
    slug = $4,
    description = $5,
    category_id = $6,
    unit = $7,
    is_active = $8,
    updated_at = NOW(),
    updated_by = $9
WHERE id = $1 AND deleted_at IS NULL
RETURNING *;

-- name: SoftDeleteProduct :exec
UPDATE product.products
SET 
    deleted_at = NOW(),
    updated_by = $2
WHERE id = $1;
