-- name: 000014_phase2_permissions.down.sql

DELETE FROM auth.role_permissions 
WHERE permission_id IN (
    SELECT id FROM auth.permissions 
    WHERE name IN ('product:view:all', 'product:manage:all', 'product:update_price:all', 'branch:update:all')
);

DELETE FROM auth.permissions 
WHERE name IN ('product:view:all', 'product:manage:all', 'product:update_price:all', 'branch:update:all');
