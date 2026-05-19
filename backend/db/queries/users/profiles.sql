-- name: CreateProfile :one
INSERT INTO users.profiles (
    user_id, display_name, phone, address, avatar_url, bio
) VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetProfileByUserID :one
SELECT * FROM users.profiles WHERE user_id = $1 LIMIT 1;

-- name: UpdateProfile :one
UPDATE users.profiles
SET
    display_name = $1,
    phone        = COALESCE($2, phone),
    address      = COALESCE($3, address),
    avatar_url   = COALESCE($4, avatar_url),
    bio          = COALESCE($5, bio),
    updated_at   = now()
WHERE user_id = $6
RETURNING *;
