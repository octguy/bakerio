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