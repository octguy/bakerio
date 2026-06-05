-- name: GetMembershipByUserID :one
SELECT * FROM users.memberships WHERE user_id = $1 LIMIT 1;

-- name: UpsertMembershipSpend :one
-- Atomic increment used by /orders/confirm. On conflict, total_spent grows
-- by EXCLUDED.total_spent (the delta the caller passed). Tier is NOT touched
-- here — service recomputes it from the new total via a pure Go function and
-- calls UpdateMembershipTier in the same tx.
INSERT INTO users.memberships (user_id, total_spent)
VALUES ($1, $2)
ON CONFLICT (user_id) DO UPDATE
SET total_spent = users.memberships.total_spent + EXCLUDED.total_spent,
    updated_at  = NOW()
RETURNING *;

-- name: UpdateMembershipTier :one
-- Idempotent setter for the derived label. Run in the same tx as
-- UpsertMembershipSpend so a tier promotion is visible atomically with the
-- spend increment.
UPDATE users.memberships
SET tier = $2, updated_at = NOW()
WHERE user_id = $1
RETURNING *;
