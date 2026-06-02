-- name: CreateAddress :one
INSERT INTO users.addresses (
    user_id, address, latitude, longitude, is_default
) VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: ListAddressesByUser :many
SELECT * FROM users.addresses
WHERE user_id = $1
ORDER BY is_default DESC, created_at DESC;

-- name: GetAddressByID :one
SELECT * FROM users.addresses
WHERE id = $1 AND user_id = $2
LIMIT 1;

-- name: UpdateAddress :one
-- Service loads the current row, merges fields from the PATCH request, then
-- passes the full new values back here. Keeps lat/long NOT NULL without
-- needing nullable-narg gymnastics in sqlc.
UPDATE users.addresses
SET
    address    = $1,
    latitude   = $2,
    longitude  = $3,
    updated_at = NOW()
WHERE id = $4 AND user_id = $5
RETURNING *;

-- name: DeleteAddress :execrows
DELETE FROM users.addresses
WHERE id = $1 AND user_id = $2;

-- ClearDefault is run inside the same tx as SetDefault / CreateAddress(is_default=true)
-- to release the partial-unique-index slot before another row claims it.
-- name: ClearDefaultForUser :exec
UPDATE users.addresses
SET is_default = FALSE, updated_at = NOW()
WHERE user_id = $1 AND is_default = TRUE;

-- name: SetDefaultAddress :one
UPDATE users.addresses
SET is_default = TRUE, updated_at = NOW()
WHERE id = $1 AND user_id = $2
RETURNING *;
