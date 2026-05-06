-- name: CreateUser :one
INSERT INTO auth.users (
    email, email_verified, is_active
) VALUES ($1, $2, $3)
    RETURNING *;

-- name: CreateAuthCredential :one
INSERT INTO auth.auth_credentials (
    user_id, password_hash
) VALUES ($1, $2)
    RETURNING *;

-- name: GetUserByEmail :one
SELECT * FROM auth.users
WHERE email = $1
LIMIT 1;

-- name: GetUserByID :one
SELECT * FROM auth.users
WHERE id = $1
LIMIT 1;

-- name: GetUserWithCredentialsByEmail :one
SELECT u.id, email, password_hash
FROM auth.users u
JOIN auth.auth_credentials au
ON u.id = au.user_id
WHERE email = $1 and is_active = true and email_verified = true
LIMIT 1;

-- name: ActivateUser :exec
UPDATE auth.users
SET email_verified = true, is_active = true
where id = $1;

-- name: GetUserRoles :many
SELECT r.name
FROM auth.roles r
JOIN auth.user_roles ur ON r.id = ur.role_id
WHERE ur.user_id = $1;

-- name: GetCredentialsByUserID :one
SELECT password_hash FROM auth.auth_credentials WHERE user_id = $1 LIMIT 1;

-- name: UpdatePassword :exec
UPDATE auth.auth_credentials SET password_hash = $1 WHERE user_id = $2;