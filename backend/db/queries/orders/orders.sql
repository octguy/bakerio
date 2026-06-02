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

-- name: CreateOrderEvent :one
-- from_status is NULL for the initial 'pending' insert; non-null for every
-- subsequent transition. actor_id is NULL when the system drives the change.
INSERT INTO orders.order_events (
    order_id, from_status, to_status, actor_id, note
) VALUES (
    $1, $2, $3, $4, $5
)
RETURNING *;
