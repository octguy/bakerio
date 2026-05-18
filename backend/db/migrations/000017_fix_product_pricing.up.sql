-- 1. Add base_price to products
ALTER TABLE product.products ADD COLUMN base_price NUMERIC(12,2) NOT NULL DEFAULT 0;

-- 2. Create price history table (append-only)
CREATE TABLE product.product_price_history (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id   UUID NOT NULL REFERENCES product.products(id) ON DELETE CASCADE,
    branch_id    UUID REFERENCES branch.branches(id) ON DELETE CASCADE, -- NULL means base_price change
    price        NUMERIC(12,2) NOT NULL,
    effective_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    changed_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE INDEX idx_price_history_product ON product.product_price_history(product_id, effective_at DESC);
CREATE INDEX idx_price_history_branch ON product.product_price_history(branch_id) WHERE branch_id IS NOT NULL;
