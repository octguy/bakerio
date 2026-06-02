DROP INDEX IF EXISTS product.idx_branch_products_in_stock;
ALTER TABLE product.branch_products DROP COLUMN quantity;
