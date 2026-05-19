-- name: GetBranchMembership :one
SELECT * FROM branch.branch_memberships
WHERE user_id = $1
LIMIT 1;

-- name: UpsertBranchMembership :one
INSERT INTO branch.branch_memberships (user_id, branch_id)
VALUES ($1, $2)
ON CONFLICT (user_id) DO UPDATE
SET branch_id = EXCLUDED.branch_id,
    updated_at = NOW()
RETURNING *;

-- name: DeleteBranchMembership :exec
DELETE FROM branch.branch_memberships
WHERE user_id = $1;

-- name: ListUsersByBranch :many
SELECT user_id FROM branch.branch_memberships
WHERE branch_id = $1;

-- name: CountUsersByBranch :one
SELECT COUNT(*) FROM branch.branch_memberships
WHERE branch_id = $1;
