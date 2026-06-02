-- name: CreateProfile :one
INSERT INTO users.profiles (
    user_id, display_name, phone, avatar_url, bio
) VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetProfileByUserID :one
SELECT * FROM users.profiles WHERE user_id = $1 LIMIT 1;

-- name: UpdateProfile :one
UPDATE users.profiles
SET
    display_name = $1,
    phone        = COALESCE($2, phone),
    avatar_url   = COALESCE($3, avatar_url),
    bio          = COALESCE($4, bio),
    updated_at   = now()
WHERE user_id = $5
RETURNING *;
