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
WHERE email = $1
LIMIT 1;