-- Migrate the transactional outbox from auth.outbox → outbox.events.
--
-- Why: every module's confirm/commit flow writes events into this table,
-- not just auth. Living under the auth schema implied auth ownership and
-- broke the cross-module rule "a module only writes to its own tables".
-- Moving it to a dedicated outbox schema makes the producer side
-- ownership-neutral; the notification module owns the consumer side
-- (notification.user_notifications + the dispatcher).
--
-- Migration is non-destructive: unpublished rows are copied over before
-- the old table is dropped. Down-migration reverses 1:1.

CREATE SCHEMA outbox;

CREATE TABLE outbox.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    routing_key  TEXT        NOT NULL,
    payload      JSONB       NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

-- Worker poll hits this; partial index keeps it tiny because published
-- rows are eventually pruned (or stay until ops cleanup).
CREATE INDEX idx_outbox_events_unpublished
    ON outbox.events (created_at)
    WHERE published_at IS NULL;

-- Carry over anything the previous worker hadn't shipped. Fresh dev DB → no-op.
INSERT INTO outbox.events (id, routing_key, payload, created_at, published_at)
SELECT id, routing_key, payload, created_at, published_at
FROM auth.outbox;

DROP TABLE auth.outbox;
