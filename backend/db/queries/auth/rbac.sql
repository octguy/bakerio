-- name: GetPermissionsByRole :many
SELECT p.name
FROM auth.permissions p
JOIN auth.role_permissions rp ON p.id = rp.permission_id
JOIN auth.roles r ON r.id = rp.role_id
WHERE r.name = $1;

-- name: GetAllRoles :many
SELECT name FROM auth.roles;

-- name: AssignRoleByName :exec
INSERT INTO auth.user_roles (user_id, role_id)
SELECT $1, id FROM auth.roles WHERE name = $2
ON CONFLICT (user_id, role_id) DO NOTHING;

-- name: RemoveRoleByName :exec
DELETE FROM auth.user_roles
WHERE user_id = $1
  AND role_id = (SELECT id FROM auth.roles WHERE name = $2);
