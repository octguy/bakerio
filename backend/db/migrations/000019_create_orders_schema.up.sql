-- Stage 3 order domain. Schema named `orders` (not `order`) to avoid quoting
-- the reserved word in every query. Money is raw VND in NUMERIC(12,2) — the
-- .00 is cosmetic; payment gateways expect integer amounts. See
-- documents/business/order-module.md D7/D8 for the shape rationale.

CREATE SCHEMA orders;

-- ─────────────────────────────────────────────────────────────────────────────
-- orders.orders
--
-- Address is snapshotted (no FK to any address row, no FK to profile). The
-- order is an immutable historical record; its source can change or be
-- deleted and the order stays correct. branch_id is the fulfillment branch
-- chosen via the routing endpoint (D14) — also a soft reference (no FK)
-- because the branch schema is owned by a different module.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE orders.orders (
    id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    code                VARCHAR(30)   NOT NULL UNIQUE,           -- public reference (format TBD; placeholder for v1)
    user_id             UUID          NOT NULL,                  -- ref auth.users.id (no cross-schema FK)
    branch_id           UUID          NOT NULL,                  -- ref branch.branches.id (no FK)

    status              VARCHAR(20)   NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','confirmed','preparing','ready','delivered','cancelled')),

    -- Snapshotted money. Recomputed from items at insert time; never trust client.
    subtotal            NUMERIC(12,2) NOT NULL,
    discount_total      NUMERIC(12,2) NOT NULL DEFAULT 0,
    shipping_fee        NUMERIC(12,2) NOT NULL DEFAULT 0,
    total               NUMERIC(12,2) NOT NULL,

    -- Snapshotted shipping. No FK to users.profiles or any future address catalog.
    shipping_address    VARCHAR(500)  NOT NULL,
    shipping_latitude   NUMERIC(9,6)  NULL,
    shipping_longitude  NUMERIC(9,6)  NULL,
    contact_phone       VARCHAR(20)   NULL,
    note                VARCHAR(500)  NULL,

    -- Why we picked this branch — `nearest_eligible` or `no_geocode_fallback`.
    -- Cheap observability for routing decisions.
    routing_reason      VARCHAR(50)   NULL,

    placed_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Customer "my orders" page — newest first.
CREATE INDEX idx_orders_user_placed
    ON orders.orders (user_id, placed_at DESC);

-- Branch dashboard "what do I need to deal with right now" — non-terminal first.
CREATE INDEX idx_orders_branch_status
    ON orders.orders (branch_id, status);

-- ─────────────────────────────────────────────────────────────────────────────
-- orders.order_items
--
-- name_snap + unit_price_snap are what the invoice prints. product_id is a
-- soft reference for analytics (best-sellers, reorder buttons); never read
-- for invoicing. line_total = unit_price_snap * quantity, denormalized so
-- order totals don't require multiplying at read time.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE orders.order_items (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        UUID          NOT NULL REFERENCES orders.orders(id) ON DELETE CASCADE,
    product_id      UUID          NOT NULL,                       -- soft ref (no FK)
    name_snap       VARCHAR(200)  NOT NULL,
    unit_price_snap NUMERIC(12,2) NOT NULL,
    quantity        INT           NOT NULL CHECK (quantity > 0),
    line_total      NUMERIC(12,2) NOT NULL
);
CREATE INDEX idx_order_items_order ON orders.order_items (order_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- orders.order_events
--
-- Audit trail for status transitions. Written in the same tx as the status
-- UPDATE so the timeline is always consistent with the current state.
-- Captures who triggered it (NULL = system) and an optional free-text note
-- for cancellation reasons / dispute context.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE orders.order_events (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id    UUID         NOT NULL REFERENCES orders.orders(id) ON DELETE CASCADE,
    from_status VARCHAR(20)  NULL,                                -- NULL for the initial 'pending' insert
    to_status   VARCHAR(20)  NOT NULL,
    actor_id    UUID         NULL,                                -- NULL = system / cron
    note        VARCHAR(500) NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_order_events_order ON orders.order_events (order_id, created_at);
