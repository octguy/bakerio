ALTER TABLE procurement.purchase_orders
DROP COLUMN IF EXISTS code,
DROP COLUMN IF EXISTS submitted_at,
DROP COLUMN IF EXISTS approved_by,
DROP COLUMN IF EXISTS approved_at,
DROP COLUMN IF EXISTS received_at,
DROP COLUMN IF EXISTS cancelled_at;
