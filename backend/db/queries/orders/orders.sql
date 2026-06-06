-- name: CountOrders :one
SELECT COUNT(*) FROM orders.orders;

-- name: GetOrderByID :one
SELECT * FROM orders.orders WHERE id = $1 LIMIT 1;

-- name: GetOrderByCode :one
SELECT * FROM orders.orders WHERE code = $1 LIMIT 1;

-- name: ListOrderItemsByOrderID :many
SELECT * FROM orders.order_items
WHERE order_id = $1
ORDER BY id;

-- name: ListOrderItemsByOrderIDs :many
-- Batch fetch used by GET /orders when the caller is admin/branch staff —
-- they get items inlined for each order so the list page doesn't need a
-- second round trip per row. Customer callers skip this.
SELECT * FROM orders.order_items
WHERE order_id = ANY($1::uuid[])
ORDER BY order_id, id;

-- name: CreateOrder :one
INSERT INTO orders.orders (
    code, user_id, branch_id,
    subtotal, discount_total, shipping_fee, total,
    shipping_address, shipping_latitude, shipping_longitude,
    contact_phone, note, routing_reason
) VALUES (
    $1, $2, $3,
    $4, $5, $6, $7,
    $8, $9, $10,
    $11, $12, $13
)
RETURNING *;

-- name: CreateOrderItem :one
INSERT INTO orders.order_items (
    order_id, product_id, name_snap, unit_price_snap, quantity, line_total
) VALUES (
    $1, $2, $3, $4, $5, $6
)
RETURNING *;

