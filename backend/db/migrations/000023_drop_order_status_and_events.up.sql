-- v1 has no order lifecycle: HCMC orders ship within hours, no cancel
-- mechanism, no status transitions. The status column + order_events audit
-- table existed for the lifecycle we're not building. Drop both.
--
-- If/when lifecycle returns (e.g. payment integration needs a 'paid' state),
-- bring back a narrower column — booleans like `delivered_at` may be enough.

DROP TABLE IF EXISTS orders.order_events;

DROP INDEX IF EXISTS orders.idx_orders_branch_status;
ALTER TABLE orders.orders DROP COLUMN status;

-- Replace the (branch_id, status) composite with a plain branch_id index —
-- the order list queries filter by branch_id for branch_manager scope.
CREATE INDEX idx_orders_branch ON orders.orders (branch_id);
