-- Phase O1b: codegen smoke test only. Real CRUD queries land in Phase O2.

-- name: CountOrders :one
SELECT COUNT(*) FROM orders.orders;

-- name: GetOrderByCode :one
SELECT * FROM orders.orders WHERE code = $1 LIMIT 1;
