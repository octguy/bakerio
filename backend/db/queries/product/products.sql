-- name: CreateProduct :one
INSERT INTO product.products (
    sku, name, slug, description, category_id, unit, base_price, created_by, updated_by
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9
) RETURNING *;

-- name: GetProductByID :one
SELECT * FROM product.products
WHERE id = $1 AND deleted_at IS NULL;

-- name: GetProductWithCategoryByID :one
SELECT p.*, c.name as category_name, c.slug as category_slug
FROM product.products p
LEFT JOIN product.categories c ON p.category_id = c.id
WHERE p.id = $1 AND p.deleted_at IS NULL;

-- name: GetProductBySlug :one
SELECT * FROM product.products
WHERE slug = $1 AND deleted_at IS NULL;

-- name: ListProducts :many
SELECT p.*, c.name as category_name, c.slug as category_slug
FROM product.products p
LEFT JOIN product.categories c ON p.category_id = c.id
WHERE p.deleted_at IS NULL
ORDER BY p.name ASC;

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
    base_price = $9,
    updated_at = NOW(),
    updated_by = $10
WHERE id = $1 AND deleted_at IS NULL
RETURNING *;

-- name: UpdateProductPrice :one
UPDATE product.products
SET 
    base_price = $2,
    updated_at = NOW(),
    updated_by = $3
WHERE id = $1 AND deleted_at IS NULL
RETURNING *;

-- name: SoftDeleteProduct :exec
UPDATE product.products
SET 
    deleted_at = NOW(),
    updated_by = $2
WHERE id = $1;
