-- v1 permission set. Folded together: original phase-1 perms + product/branch perms
-- previously seeded by 000014. Migration 014 is now a no-op.

INSERT INTO auth.permissions (name) VALUES
    -- wildcard
    ('*:*:all'),
    -- profile (everyone authenticated)
    ('profile:manage:own'),
    -- branch
    ('branch:view:all'),
    ('branch:manage:all'),
    ('branch:manage:own'),
    -- user mgmt
    ('user:view:all'),
    ('user:manage:all'),
    ('user:manage:branch'),
    -- product
    ('product:view:all'),
    ('product:manage:all'),
    -- voucher
    ('voucher:manage:all'),
    ('voucher:apply:own'),
    -- cart
    ('cart:manage:own'),
    -- address
    ('address:manage:own'),
    -- order (customer)
    ('order:create:own'),
    ('order:view:own'),
    ('order:cancel:own'),
    -- order (branch staff/manager)
    ('order:view:branch'),
    ('order:update:branch'),
    -- payment
    ('payment:pay:own'),
    ('payment:mark:branch');

-- super_admin: wildcard
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM auth.roles r, auth.permissions p
WHERE r.name = 'super_admin' AND p.name = '*:*:all';

-- product_manager
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM auth.roles r, auth.permissions p
WHERE r.name = 'product_manager'
  AND p.name IN (
      'profile:manage:own',
      'product:view:all', 'product:manage:all',
      'voucher:manage:all'
  );

-- branch_manager
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM auth.roles r, auth.permissions p
WHERE r.name = 'branch_manager'
  AND p.name IN (
      'profile:manage:own',
      'branch:view:all', 'branch:manage:own',
      'user:manage:branch',
      'product:view:all',
      'order:view:branch', 'order:update:branch',
      'payment:mark:branch'
  );

-- branch_staff
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM auth.roles r, auth.permissions p
WHERE r.name = 'branch_staff'
  AND p.name IN (
      'profile:manage:own',
      'branch:view:all',
      'product:view:all',
      'order:view:branch', 'order:update:branch',
      'payment:mark:branch'
  );

-- customer
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM auth.roles r, auth.permissions p
WHERE r.name = 'customer'
  AND p.name IN (
      'profile:manage:own',
      'branch:view:all',
      'product:view:all',
      'cart:manage:own',
      'address:manage:own',
      'order:create:own', 'order:view:own', 'order:cancel:own',
      'voucher:apply:own',
      'payment:pay:own'
  );

-- guest
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM auth.roles r, auth.permissions p
WHERE r.name = 'guest'
  AND p.name IN (
      'branch:view:all',
      'product:view:all',
      'cart:manage:own'
  );
