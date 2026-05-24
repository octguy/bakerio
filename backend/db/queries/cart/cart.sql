-- name: GetCartByUser :one
SELECT * FROM cart.carts
WHERE user_id = $1;

-- name: CreateCart :one
INSERT INTO cart.carts (user_id)
VALUES ($1)
RETURNING *;

-- name: UpsertCartItem :one
INSERT INTO cart.cart_items (cart_id, product_id, quantity, unit_price_snap)
VALUES ($1, $2, $3, $4)
ON CONFLICT (cart_id, product_id) DO UPDATE
SET quantity        = LEAST(cart.cart_items.quantity + EXCLUDED.quantity, 99),
    unit_price_snap = EXCLUDED.unit_price_snap,
    added_at        = NOW()
RETURNING *;

-- name: SetCartItemQuantity :one
UPDATE cart.cart_items
SET quantity        = $3,
    unit_price_snap = $4,
    added_at        = NOW()
WHERE cart_id = $1 AND product_id = $2
RETURNING *;

-- name: DeleteCartItem :exec
DELETE FROM cart.cart_items
WHERE cart_id = $1 AND product_id = $2;

-- name: ListCartItems :many
SELECT * FROM cart.cart_items
WHERE cart_id = $1
ORDER BY added_at ASC;

-- name: ClearCartItems :exec
DELETE FROM cart.cart_items
WHERE cart_id = $1;
