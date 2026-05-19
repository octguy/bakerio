-- name: AddProductImage :one
INSERT INTO product.product_images (
    product_id, url, is_primary, sort_order, created_by
) VALUES (
    $1, $2, $3, $4, $5
) RETURNING *;

-- name: ListProductImages :many
SELECT * FROM product.product_images
WHERE product_id = $1
ORDER BY sort_order ASC;

-- name: ClearPrimaryImage :exec
UPDATE product.product_images
SET is_primary = false
WHERE product_id = $1;

-- name: SetPrimaryImage :exec
UPDATE product.product_images
SET is_primary = true
WHERE id = $1;

-- name: DeleteProductImage :exec
DELETE FROM product.product_images
WHERE id = $1;
