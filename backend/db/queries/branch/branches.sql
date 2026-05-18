-- name: CreateBranch :one
INSERT INTO branch.branches (
    name, address, lat, lng, created_by, updated_by
) VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetBranchByID :one
SELECT * FROM branch.branches
WHERE id = $1 AND deleted_at IS NULL
LIMIT 1;

-- name: GetAllBranches :many
SELECT * FROM branch.branches
WHERE deleted_at IS NULL;

-- name: UpdateBranchStatus :exec
UPDATE branch.branches
SET status = $1, updated_by = $2
WHERE id = $3 AND deleted_at IS NULL;

-- name: UpdateBranch :one
UPDATE branch.branches
SET
    name = $1,
    address = $2,
    lat = $3,
    lng = $4,
    updated_by = $5
WHERE id = $6 AND deleted_at IS NULL
RETURNING *;

-- name: SoftDeleteBranch :exec
UPDATE branch.branches
SET deleted_at = NOW(), updated_by = $1
WHERE id = $2;
