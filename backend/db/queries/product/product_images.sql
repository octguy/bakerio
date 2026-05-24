-- name: CreateProductImage :one
INSERT INTO product.product_images (
    product_id, image_url, alt_text, sort_order, created_by, updated_by
) VALUES (
    $1, $2, $3, $4, $5, $5
) RETURNING *;

-- name: ListImagesByProduct :many
SELECT * FROM product.product_images
WHERE product_id = $1
ORDER BY sort_order ASC, created_at ASC;

-- name: ListImagesByProductIDs :many
SELECT * FROM product.product_images
WHERE product_id = ANY($1::uuid[])
ORDER BY sort_order ASC, created_at ASC;

-- name: DeleteProductImage :exec
DELETE FROM product.product_images
WHERE id = $1;
