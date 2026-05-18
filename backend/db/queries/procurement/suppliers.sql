-- name: CreateSupplier :one
INSERT INTO procurement.suppliers (
    name, contact_info, region, created_by, updated_by
) VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetSupplierByID :one
SELECT * FROM procurement.suppliers
WHERE id = $1 AND deleted_at IS NULL;

-- name: ListSuppliersByRegion :many
SELECT * FROM procurement.suppliers
WHERE region = $1 AND deleted_at IS NULL
ORDER BY name ASC;

-- name: UpdateSupplier :one
UPDATE procurement.suppliers
SET name = $2, contact_info = $3, region = $4, is_active = $5, updated_at = NOW(), updated_by = $6
WHERE id = $1 AND deleted_at IS NULL
RETURNING *;

-- name: SoftDeleteSupplier :exec
UPDATE procurement.suppliers
SET deleted_at = NOW(), updated_by = $2
WHERE id = $1 AND deleted_at IS NULL;
