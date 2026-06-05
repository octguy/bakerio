-- v1 membership domain. One row per customer tracking cumulative lifetime
-- spend; tier is derived in-line on every order confirm. Pure label — grants
-- nothing functional. See documents/business/voucher-membership.md §2.

CREATE TABLE users.memberships (
    user_id      UUID          PRIMARY KEY,                          -- ref auth.users.id (no cross-schema FK)
    tier         VARCHAR(10)   NOT NULL DEFAULT 'BRONZE'
                   CHECK (tier IN ('BRONZE','SILVER','GOLD')),
    total_spent  NUMERIC(14,2) NOT NULL DEFAULT 0
                   CHECK (total_spent >= 0),
    updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Cheap lookup for any future "top spenders" admin view; safe to add now since
-- it costs nothing on writes against a per-user table.
CREATE INDEX idx_memberships_total_spent ON users.memberships (total_spent DESC);
