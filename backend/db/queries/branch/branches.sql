-- name: CreateBranch :one
INSERT INTO branch.branches (
    name, address, lat, lng
) VALUES ($1, $2, $3, $4)
    RETURNING *;

-- name: GetBranchByID :one
SELECT * FROM branch.branches
WHERE id = $1
LIMIT 1;

-- name: GetAllBranches :many
SELECT * FROM branch.branches;

-- name: UpdateBranchStatus :exec
UPDATE branch.branches
SET status = $1
WHERE id = $2;

-- name: UpdateBranch :one
UPDATE branch.branches
SET
    name = $1,
    address = $2,
    lat = $3,
    lng = $4
WHERE id = $5
RETURNING *;