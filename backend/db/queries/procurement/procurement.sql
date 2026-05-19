-- name: CreatePurchaseOrder :one
INSERT INTO procurement.purchase_orders (
    supplier_id, branch_id, status, total_amount, note, code, created_by, updated_by
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- name: GetPurchaseOrder :one
SELECT * FROM procurement.purchase_orders
WHERE id = $1 AND deleted_at IS NULL;

-- name: ListPurchaseOrdersByBranch :many
SELECT * FROM procurement.purchase_orders
WHERE branch_id = $1 AND deleted_at IS NULL
ORDER BY created_at DESC;

-- name: UpdatePOStatus :one
UPDATE procurement.purchase_orders
SET status = $2, version = version + 1, updated_at = NOW(), updated_by = $3
WHERE id = $1 AND version = $4 AND deleted_at IS NULL
RETURNING *;

-- name: CreatePOItem :one
INSERT INTO procurement.po_items (
    po_id, product_id, quantity, unit_price
) VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetPOItems :many
SELECT * FROM procurement.po_items
WHERE po_id = $1;

-- name: ListAllPurchaseOrders :many
SELECT * FROM procurement.purchase_orders
WHERE deleted_at IS NULL
ORDER BY created_at DESC;

-- name: SetPOSubmittedAt :exec
UPDATE procurement.purchase_orders
SET submitted_at = NOW()
WHERE id = $1;

-- name: SetPOApproved :exec
UPDATE procurement.purchase_orders
SET approved_by = $2, approved_at = NOW()
WHERE id = $1;

-- name: SetPOReceivedAt :exec
UPDATE procurement.purchase_orders
SET received_at = NOW()
WHERE id = $1;

-- name: SetPOCancelledAt :exec
UPDATE procurement.purchase_orders
SET cancelled_at = NOW()
WHERE id = $1;
