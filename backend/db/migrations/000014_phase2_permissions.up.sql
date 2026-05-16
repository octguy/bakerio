-- name: 000014_phase2_permissions.up.sql

-- 1. Create Permissions
INSERT INTO auth.permissions (name) VALUES
  ('product:view:all'),
  ('product:manage:all'),
  ('product:update_price:all'),
  ('branch:update:all') -- Also add this from branch module cleanup
ON CONFLICT (name) DO NOTHING;

-- 2. Grant to Super Admin & General Manager
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM auth.roles r, auth.permissions p
WHERE r.name IN ('super_admin', 'general_manager')
  AND p.name IN ('product:view:all', 'product:manage:all', 'product:update_price:all', 'branch:update:all')
ON CONFLICT DO NOTHING;

-- 3. Grant to Marketing Manager (Owns pricing and catalog)
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM auth.roles r, auth.permissions p
WHERE r.name = 'marketing_manager'
  AND p.name IN ('product:view:all', 'product:manage:all', 'product:update_price:all')
ON CONFLICT DO NOTHING;

-- 4. Grant to Inventory Manager (Can manage catalog but not price)
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM auth.roles r, auth.permissions p
WHERE r.name = 'inventory_manager'
  AND p.name IN ('product:view:all', 'product:manage:all')
ON CONFLICT DO NOTHING;

-- 5. Grant View only to Store Level Staff
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM auth.roles r, auth.permissions p
WHERE r.name IN ('store_manager', 'staff_cashier', 'baker', 'shipper')
  AND p.name = 'product:view:all'
ON CONFLICT DO NOTHING;
