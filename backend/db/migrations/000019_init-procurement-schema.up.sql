-- 1. Add region to branches
ALTER TABLE branch.branches ADD COLUMN region VARCHAR(50) NOT NULL DEFAULT 'south';
CREATE INDEX idx_branches_region ON branch.branches(region);

-- 2. Create procurement schema
CREATE SCHEMA IF NOT EXISTS procurement;

-- 3. Suppliers table
CREATE TABLE procurement.suppliers (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    contact_info TEXT,
    region      VARCHAR(50) NOT NULL, -- north, central, south
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE INDEX idx_suppliers_region ON procurement.suppliers(region) WHERE deleted_at IS NULL;

-- 4. Purchase Orders table
CREATE TABLE procurement.purchase_orders (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id   UUID NOT NULL REFERENCES procurement.suppliers(id),
    branch_id     UUID NOT NULL REFERENCES branch.branches(id),
    status        VARCHAR(50) NOT NULL DEFAULT 'DRAFT', -- DRAFT, PENDING, APPROVED, REJECTED, RECEIVED
    total_amount  NUMERIC(12,2) NOT NULL DEFAULT 0,
    note          TEXT,
    deleted_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE INDEX idx_po_branch_status ON procurement.purchase_orders(branch_id, status) WHERE deleted_at IS NULL;

-- 5. PO Items table
CREATE TABLE procurement.po_items (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id         UUID NOT NULL REFERENCES procurement.purchase_orders(id) ON DELETE CASCADE,
    product_id    UUID NOT NULL REFERENCES product.products(id),
    quantity      NUMERIC(12,2) NOT NULL,
    unit_price    NUMERIC(12,2) NOT NULL,
    total_price   NUMERIC(12,2) NOT NULL
);

-- 6. Outbox table
CREATE TABLE procurement.outbox (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    routing_key   VARCHAR(255) NOT NULL,
    payload       JSONB NOT NULL,
    published_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Permissions
INSERT INTO auth.permissions (name) VALUES
  ('supplier:view:all'),
  ('supplier:manage:all'),
  ('procurement:view:branch'),
  ('procurement:manage:branch'),
  ('procurement:approve:branch')
ON CONFLICT (name) DO NOTHING;
