-- name: GetPermissionsByRole :many
SELECT p.name
FROM auth.permissions p
JOIN auth.role_permissions rp ON p.id = rp.permission_id
JOIN auth.roles r ON r.id = rp.role_id
WHERE r.name = $1;

-- name: GetAllRoles :many
SELECT id, name, description FROM auth.roles;

-- name: AssignRoleByName :exec
INSERT INTO auth.user_roles (user_id, role_id)
SELECT $1, id FROM auth.roles WHERE name = $2
ON CONFLICT (user_id, role_id) DO NOTHING;

-- name: RemoveRoleByName :exec
DELETE FROM auth.user_roles
WHERE user_id = $1
  AND role_id = (SELECT id FROM auth.roles WHERE name = $2);

-- name: GetRoleById :one
SELECT * FROM auth.roles
WHERE id = $1;

-- name: GetRoleByName :one
SELECT * FROM auth.roles
WHERE name = $1;

-- name: GetPermissionById :one
SELECT * FROM auth.permissions
WHERE id = $1;

-- name: GetPermissionByName :one
SELECT * FROM auth.permissions
WHERE name = $1;

-- name: GetPermissionsByUserId :many
SELECT p.id, p.name
FROM auth.permissions p
JOIN auth.role_permissions rp ON p.id = rp.permission_id
JOIN auth.user_roles ur ON ur.role_id = rp.role_id
WHERE ur.user_id = $1;

-- name: CreateRole :one
INSERT INTO auth.roles (name, description)
VALUES ($1, $2)
RETURNING *;

-- name: AddPermissionsToRole :exec
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT @role_id, p
FROM unnest(@permission_ids::uuid[]) p
    ON CONFLICT DO NOTHING;

-- name: RemovePermissionsFromRole :exec
DELETE FROM auth.role_permissions
WHERE role_id = @role_id
    AND permission_id = ANY(@permission_ids::uuid[]);

-- name: GetPermissionIdsByRoleId :many
SELECT p.id
FROM auth.permissions p
JOIN auth.role_permissions rp ON p.id = rp.permission_id
WHERE rp.role_id = $1;

-- name: GetAllPermissions :many
SELECT id, name FROM auth.permissions;