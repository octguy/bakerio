CREATE SCHEMA IF NOT EXISTS cart;

CREATE TABLE cart.carts (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL UNIQUE,        -- 1:1 with auth.users.id, no cross-schema FK
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cart.cart_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id         UUID NOT NULL REFERENCES cart.carts(id) ON DELETE CASCADE,
    product_id      UUID NOT NULL,           -- no cross-schema FK to product
    quantity        INT  NOT NULL CHECK (quantity > 0 AND quantity <= 99),
    unit_price_snap NUMERIC(10, 2) NOT NULL, -- price snapshot at add time
    added_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (cart_id, product_id)
);

CREATE INDEX idx_cart_items_cart ON cart.cart_items (cart_id);
