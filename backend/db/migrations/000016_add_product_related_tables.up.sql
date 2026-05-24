CREATE TABLE product.products (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) UNIQUE NOT NULL,
    slug        VARCHAR(120) UNIQUE NOT NULL,
    category_id UUID NOT NULL REFERENCES product.categories(id) ON DELETE RESTRICT,
    price       NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (price >= 0),
    sort_order  INT NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by  UUID,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by  UUID
);

CREATE TABLE product.product_images (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id  UUID NOT NULL REFERENCES product.products(id) ON DELETE CASCADE,
    image_url   TEXT NOT NULL,
    alt_text    VARCHAR(255),
    sort_order  INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by  UUID,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by  UUID
);

CREATE TABLE product.branch_products (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id  UUID NOT NULL REFERENCES product.products(id) ON DELETE CASCADE,
    branch_id   UUID NOT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by  UUID,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by  UUID,
    UNIQUE (product_id, branch_id)
);

-- FK / filter indexes
CREATE INDEX idx_products_category_id   ON product.products (category_id);
CREATE INDEX idx_product_images_product ON product.product_images (product_id);
CREATE INDEX idx_branch_products_branch ON product.branch_products (branch_id) WHERE is_active;
