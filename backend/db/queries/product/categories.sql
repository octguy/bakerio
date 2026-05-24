-- name: CreateCategory :one
INSERT INTO product.categories (
    name, slug, sort_order, created_by, updated_by
) VALUES (
    $1, $2, $3, $4, $5
) RETURNING *;

-- name: GetCategoryByID :one
SELECT * FROM product.categories
WHERE id = $1 AND deleted_at IS NULL;

-- name: GetCategoryBySlug :one
SELECT * FROM product.categories
WHERE slug = $1 AND deleted_at IS NULL;

-- name: ListCategories :many
SELECT * FROM product.categories
WHERE deleted_at IS NULL
ORDER BY sort_order ASC, name ASC;

-- name: UpdateCategory :one
UPDATE product.categories
SET 
    name = $2,
    slug = $3,
    sort_order = $4,
    is_active = $5,
    updated_at = NOW(),
    updated_by = $6
WHERE id = $1 AND deleted_at IS NULL
RETURNING *;

-- name: SoftDeleteCategory :exec
UPDATE product.categories
SET 
    deleted_at = NOW(),
    updated_by = $2
WHERE id = $1;
