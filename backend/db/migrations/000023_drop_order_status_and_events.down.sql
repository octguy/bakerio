DROP INDEX IF EXISTS orders.idx_orders_branch;

ALTER TABLE orders.orders ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','preparing','ready','delivered','cancelled'));

CREATE INDEX idx_orders_branch_status
    ON orders.orders (branch_id, status);

CREATE TABLE orders.order_events (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id    UUID         NOT NULL REFERENCES orders.orders(id) ON DELETE CASCADE,
    from_status VARCHAR(20)  NULL,
    to_status   VARCHAR(20)  NOT NULL,
    actor_id    UUID         NULL,
    note        VARCHAR(500) NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_order_events_order ON orders.order_events (order_id, created_at);
