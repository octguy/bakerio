DROP TABLE IF EXISTS procurement.outbox;
DROP TABLE IF EXISTS procurement.po_items;
DROP TABLE IF EXISTS procurement.purchase_orders;
DROP TABLE IF EXISTS procurement.suppliers;
DROP SCHEMA IF EXISTS procurement;

ALTER TABLE branch.branches DROP COLUMN IF EXISTS region;

DELETE FROM auth.permissions WHERE name IN (
  'supplier:view:all',
  'supplier:manage:all',
  'procurement:view:branch',
  'procurement:manage:branch',
  'procurement:approve:branch'
);
