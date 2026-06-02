-- Phase O1b: codegen smoke test only. Real CRUD queries (CreateOrder,
-- ListOrdersByUser, transitions, etc.) land in Phase O2.

-- name: CountOrders :one
-- Sanity ping for support tooling + a query for sqlc to generate something
-- against orders.orders. Will be replaced or augmented in O2.
SELECT COUNT(*) FROM orders.orders;

-- name: GetOrderByCode :one
-- Customer-facing lookup by the human-readable order code (format TBD;
-- placeholder placeholder until O2 settles on a generator). Used by
-- support tooling and the customer "track my order" page.
SELECT * FROM orders.orders WHERE code = $1 LIMIT 1;
