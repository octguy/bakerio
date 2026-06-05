-- name: CreateRedemption :one
-- Inserted inside /orders/confirm's tx. Unique violation on
-- (voucher_id, user_id) → caller rolls back the whole tx and returns 409.
INSERT INTO voucher.redemptions (voucher_id, user_id, order_id, discount_amount)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetRedemptionByUserVoucher :one
-- Informational pre-check used at /orders/select-branch so we can surface
-- VOUCHER_ALREADY_USED before the user clicks Confirm. The CreateRedemption
-- unique constraint is what actually enforces the rule.
SELECT * FROM voucher.redemptions
WHERE voucher_id = $1 AND user_id = $2
LIMIT 1;
