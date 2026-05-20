CREATE SCHEMA IF NOT EXISTS product;

CREATE TABLE product.categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) UNIQUE NOT NULL,
    slug        VARCHAR(120) UNIQUE NOT NULL,
    parent_id   UUID REFERENCES product.categories(id) ON DELETE SET NULL,
    sort_order  INT NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by  UUID,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by  UUID
);
CREATE INDEX idx_categories_parent ON product.categories(parent_id) WHERE deleted_at IS NULL;
