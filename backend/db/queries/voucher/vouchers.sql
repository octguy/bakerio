-- name: GetVoucherByID :one
SELECT * FROM voucher.vouchers WHERE id = $1 LIMIT 1;

-- name: GetVoucherByCode :one
SELECT * FROM voucher.vouchers WHERE code = $1 LIMIT 1;

-- name: ListVouchers :many
-- Admin matrix view. The boolean "filter_active" picks whether to constrain
-- by is_active; when false, the is_active argument is ignored.
SELECT * FROM voucher.vouchers
WHERE (NOT sqlc.arg('filter_active')::boolean OR is_active = sqlc.arg('is_active')::boolean)
ORDER BY created_at DESC
LIMIT sqlc.arg('lim') OFFSET sqlc.arg('off');

-- name: CountVouchers :one
SELECT COUNT(*) FROM voucher.vouchers
WHERE (NOT sqlc.arg('filter_active')::boolean OR is_active = sqlc.arg('is_active')::boolean);

-- name: CreateVoucher :one
INSERT INTO voucher.vouchers (
    code, discount_percent, max_discount, min_subtotal,
    valid_from, valid_to, is_active, created_by, updated_by
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $8
)
RETURNING *;

-- name: UpdateVoucher :one
-- Patch fields on a voucher. The boolean "set_*" flags pick whether the
-- corresponding column is overwritten or left as-is. updated_by/updated_at
-- always change so audit trail is correct even on a no-op call.
UPDATE voucher.vouchers
SET discount_percent = CASE WHEN sqlc.arg('set_percent')::boolean
                            THEN sqlc.arg('discount_percent')::smallint
                            ELSE discount_percent END,
    max_discount     = CASE WHEN sqlc.arg('set_max_discount')::boolean
                            THEN sqlc.narg('max_discount')::numeric
                            ELSE max_discount END,
    min_subtotal     = CASE WHEN sqlc.arg('set_min_subtotal')::boolean
                            THEN sqlc.narg('min_subtotal')::numeric
                            ELSE min_subtotal END,
    valid_from       = CASE WHEN sqlc.arg('set_valid_from')::boolean
                            THEN sqlc.arg('valid_from')::timestamptz
                            ELSE valid_from END,
    valid_to         = CASE WHEN sqlc.arg('set_valid_to')::boolean
                            THEN sqlc.arg('valid_to')::timestamptz
                            ELSE valid_to END,
    is_active        = CASE WHEN sqlc.arg('set_is_active')::boolean
                            THEN sqlc.arg('is_active')::boolean
                            ELSE is_active END,
    updated_at       = NOW(),
    updated_by       = sqlc.arg('updated_by')
WHERE id = $1
RETURNING *;
