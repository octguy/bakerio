-- Per-branch stock-on-hand for each product. Decremented atomically inside
-- the order-creation tx; refilled by branch staff via a future endpoint.
-- Default 0 means: a freshly created branch_products row is out of stock
-- until staff explicitly stocks it. seed_demo seeds realistic values for dev.
ALTER TABLE product.branch_products
    ADD COLUMN quantity INT NOT NULL DEFAULT 0 CHECK (quantity >= 0);

-- Hot-path partial index for the routing eligibility query: "branches that
-- have this product in stock right now". Skips inactive and zero-stock rows
-- entirely, keeping the index small.
CREATE INDEX idx_branch_products_in_stock
    ON product.branch_products (branch_id, product_id)
    WHERE is_active = TRUE AND quantity > 0;
