-- name: CreateProfile :one
INSERT INTO profile.profiles (
    user_id, display_name, avatar_url, bio
) VALUES ($1, $2, $3, $4)
RETURNING *;