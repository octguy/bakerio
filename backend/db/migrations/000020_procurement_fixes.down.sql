-- Reverse role grants (best-effort; safe even if rows already gone).
DELETE FROM auth.role_permissions
USING auth.roles r, auth.permissions p
WHERE auth.role_permissions.role_id = r.id
  AND auth.role_permissions.permission_id = p.id
  AND r.name IN ('inventory_manager', 'store_manager')
  AND p.name IN ('supplier:view:all', 'supplier:manage:all',
                 'procurement:view:branch', 'procurement:manage:branch',
                 'procurement:approve:branch');

DROP TABLE IF EXISTS shared.processed_events;
DROP SCHEMA IF EXISTS shared;

ALTER TABLE procurement.po_items DROP COLUMN total_price;
ALTER TABLE procurement.po_items
  ADD COLUMN total_price NUMERIC(12,2) NOT NULL DEFAULT 0;

ALTER TABLE procurement.purchase_orders DROP COLUMN version;
