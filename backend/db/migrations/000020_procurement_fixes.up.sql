-- 1. Optimistic locking column on purchase_orders.
--    Service-layer enforcement (WHERE version = $X) is a separate change.
ALTER TABLE procurement.purchase_orders
  ADD COLUMN version INT NOT NULL DEFAULT 0;

-- 2. Make po_items.total_price a generated column so line totals
--    cannot drift from quantity * unit_price.
ALTER TABLE procurement.po_items DROP COLUMN total_price;
ALTER TABLE procurement.po_items
  ADD COLUMN total_price NUMERIC(12,2)
    GENERATED ALWAYS AS (quantity * unit_price) STORED;

-- 3. shared.processed_events for outbox-consumer deduplication.
--    Phase2.md §0.5b. Created here because procurement is the first
--    module that emits events outside auth.
CREATE SCHEMA IF NOT EXISTS shared;

CREATE TABLE shared.processed_events (
    event_id     UUID PRIMARY KEY,
    consumer     VARCHAR(100) NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Role grants for procurement permissions seeded in 000019.
--    Without these the endpoints are unreachable.
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM auth.roles r, auth.permissions p
WHERE r.name = 'inventory_manager'
  AND p.name IN ('supplier:view:all', 'supplier:manage:all',
                 'procurement:view:branch', 'procurement:manage:branch',
                 'procurement:approve:branch')
ON CONFLICT DO NOTHING;

INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM auth.roles r, auth.permissions p
WHERE r.name = 'store_manager'
  AND p.name IN ('supplier:view:all',
                 'procurement:view:branch', 'procurement:manage:branch')
ON CONFLICT DO NOTHING;
