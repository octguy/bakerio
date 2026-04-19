-- Insert all unique permissions
INSERT INTO auth.permissions (name) VALUES
('*:*:all'),
('auth:manage_roles:all'),
('branch:create:all'),
('module:configure:all'),
('user:manage:all'),
('user:view:all'),
('report:view:all'),
('branch:view:all'),
('promotion:approve:all'),
('order:view:all'),
('inventory:view:all'),
('user:manage:branch'),
('inventory:approve_receipt:branch'),
('report:view:branch'),
('order:view:branch'),
('product:view:all'),
('promotion:view:all'),
('shift:manage:branch'),
('order:create:branch'),
('order:update:branch'),
('order:confirm_online:branch'),
('inventory:view:branch'),
('customer:lookup:all'),
('production:view_plan:branch'),
('production:update_output:branch'),
('inventory:update_shelf:branch'),
('delivery:view_route:branch'),
('delivery:update_status:branch'),
('delivery:confirm_cod:branch'),
('cart:manage:own'),
('order:create:own'),
('order:view:own'),
('order:cancel:own'),
('loyalty:view:own'),
('loyalty:redeem:own'),
('review:create:own'),
('profile:manage:own');

-- super_admin
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM auth.roles r, auth.permissions p
WHERE r.name = 'super_admin'
  AND p.name IN ('*:*:all','auth:manage_roles:all','branch:create:all','module:configure:all','user:manage:all');

-- general_manager
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM auth.roles r, auth.permissions p
WHERE r.name = 'general_manager'
  AND p.name IN ('report:view:all','branch:view:all','promotion:approve:all','order:view:all','user:view:all','user:manage:all','inventory:view:all');

-- store_manager
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM auth.roles r, auth.permissions p
WHERE r.name = 'store_manager'
  AND p.name IN ('user:manage:branch','inventory:approve_receipt:branch','report:view:branch','order:view:branch','product:view:all','promotion:view:all','shift:manage:branch');

-- staff_cashier
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM auth.roles r, auth.permissions p
WHERE r.name = 'staff_cashier'
  AND p.name IN ('order:create:branch','order:update:branch','order:confirm_online:branch','product:view:all','inventory:view:branch','customer:lookup:all');

-- baker
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM auth.roles r, auth.permissions p
WHERE r.name = 'baker'
  AND p.name IN ('production:view_plan:branch','production:update_output:branch','inventory:update_shelf:branch');

-- shipper
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM auth.roles r, auth.permissions p
WHERE r.name = 'shipper'
  AND p.name IN ('delivery:view_route:branch','delivery:update_status:branch','delivery:confirm_cod:branch','order:view:branch');

-- member
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM auth.roles r, auth.permissions p
WHERE r.name = 'member'
  AND p.name IN ('product:view:all','branch:view:all','cart:manage:own','order:create:own','order:view:own','order:cancel:own','loyalty:view:own','loyalty:redeem:own','review:create:own','profile:manage:own');
