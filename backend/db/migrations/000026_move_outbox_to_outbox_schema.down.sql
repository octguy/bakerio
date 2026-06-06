-- Reverse: re-create auth.outbox + copy rows back, then drop outbox schema.

CREATE TABLE auth.outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    routing_key  TEXT        NOT NULL,
    payload      JSONB       NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

CREATE INDEX idx_auth_outbox_unpublished
    ON auth.outbox (created_at)
    WHERE published_at IS NULL;

INSERT INTO auth.outbox (id, routing_key, payload, created_at, published_at)
SELECT id, routing_key, payload, created_at, published_at
FROM outbox.events;

DROP TABLE outbox.events;
DROP SCHEMA outbox;
