-- name: CreatePurchaseOrder :one
INSERT INTO procurement.purchase_orders (
    supplier_id, branch_id, status, total_amount, note, created_by, updated_by
) VALUES ($1, $2, $3, $4, $5, $6, $7)
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
SET status = $2, updated_at = NOW(), updated_by = $3
WHERE id = $1 AND deleted_at IS NULL
RETURNING *;

-- name: CreatePOItem :one
INSERT INTO procurement.po_items (
    po_id, product_id, quantity, unit_price
) VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetPOItems :many
SELECT * FROM procurement.po_items
WHERE po_id = $1;
