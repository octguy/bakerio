-- name: CreateProfile :one
INSERT INTO profile.profiles (
    user_id, display_name, avatar_url, bio
) VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetProfileByUserID :one
SELECT * FROM profile.profiles WHERE user_id = $1 LIMIT 1;

-- name: UpdateProfile :one
UPDATE profile.profiles
SET
    display_name = COALESCE($1, display_name),
    avatar_url   = $2,
    bio          = $3,
    updated_at   = now()
WHERE user_id = $4
RETURNING *;