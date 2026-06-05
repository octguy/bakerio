CREATE SCHEMA voucher;

CREATE TABLE voucher.vouchers (
    id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    code              VARCHAR(40)   NOT NULL UNIQUE,
    discount_percent  SMALLINT      NOT NULL CHECK (discount_percent BETWEEN 1 AND 100),
    max_discount      NUMERIC(12,2) NULL CHECK (max_discount IS NULL OR max_discount > 0),
    min_subtotal      NUMERIC(12,2) NULL CHECK (min_subtotal IS NULL OR min_subtotal >= 0),
    valid_from        TIMESTAMPTZ   NOT NULL,
    valid_to          TIMESTAMPTZ   NOT NULL,
    is_active         BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    created_by        UUID          NULL,
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_by        UUID          NULL,
    CHECK (valid_to >= valid_from)
);

-- Admin listing filter — "currently valid" lookups hit (is_active, valid_to).
CREATE INDEX idx_vouchers_active_window
    ON voucher.vouchers (is_active, valid_from, valid_to);

CREATE TABLE voucher.redemptions (
    id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    voucher_id       UUID          NOT NULL REFERENCES voucher.vouchers(id) ON DELETE RESTRICT,
    user_id          UUID          NOT NULL,
    order_id         UUID          NOT NULL,
    discount_amount  NUMERIC(12,2) NOT NULL CHECK (discount_amount >= 0),
    redeemed_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    UNIQUE (voucher_id, user_id)
);

-- "Has this user used voucher X yet?" + "show me my redemption history".
CREATE INDEX idx_redemptions_user ON voucher.redemptions (user_id, redeemed_at DESC);
