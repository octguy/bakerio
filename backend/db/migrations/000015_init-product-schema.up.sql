CREATE SCHEMA IF NOT EXISTS product;

-- 1. Categories
CREATE TABLE product.categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) UNIQUE NOT NULL,
    slug        VARCHAR(120) UNIQUE NOT NULL,
    parent_id   UUID REFERENCES product.categories(id) ON DELETE SET NULL,
    sort_order  INT NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE INDEX idx_categories_parent ON product.categories(parent_id) WHERE deleted_at IS NULL;

-- 2. Products
CREATE TABLE product.products (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku           VARCHAR(50) UNIQUE NOT NULL,
    name          VARCHAR(150) NOT NULL,
    slug          VARCHAR(180) UNIQUE NOT NULL,
    description   TEXT,
    category_id   UUID REFERENCES product.categories(id) ON DELETE SET NULL,
    unit          VARCHAR(20) NOT NULL DEFAULT 'piece',
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    deleted_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE INDEX idx_products_category_active
    ON product.products(category_id, is_active) WHERE deleted_at IS NULL;

-- 3. Branch-Specific Prices
CREATE TABLE product.product_prices (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id   UUID NOT NULL REFERENCES product.products(id) ON DELETE CASCADE,
    branch_id    UUID NOT NULL REFERENCES branch.branches(id) ON DELETE CASCADE,
    price        NUMERIC(12,2) NOT NULL,
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    deleted_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE (product_id, branch_id)
);
CREATE INDEX idx_product_prices_branch ON product.product_prices(branch_id) WHERE deleted_at IS NULL;

-- 4. Images
CREATE TABLE product.product_images (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id  UUID NOT NULL REFERENCES product.products(id) ON DELETE CASCADE,
    url         TEXT NOT NULL,
    is_primary  BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order  INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE INDEX idx_images_product ON product.product_images(product_id, sort_order);
CREATE UNIQUE INDEX uniq_images_primary
    ON product.product_images(product_id) WHERE is_primary;
