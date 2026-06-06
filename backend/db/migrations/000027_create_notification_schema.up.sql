-- v1 notification domain. Source of truth for the in-app bell-icon feed.
-- Producer-side events live in outbox.events; the notification consumer
-- writes one or more rows here per event (a "fan-out" event like
-- order.placed inserts one customer row + N branch-staff rows).

CREATE SCHEMA notification;

CREATE TABLE notification.user_notifications (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID         NOT NULL,                       -- ref auth.users.id (no cross-schema FK)
    type        VARCHAR(80)  NOT NULL,
    title       VARCHAR(200) NOT NULL,
    body        VARCHAR(1000) NOT NULL,
    data        JSONB        NOT NULL DEFAULT '{}'::jsonb,
    read_at     TIMESTAMPTZ  NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Customer "my notifications" page — newest first.
CREATE INDEX idx_user_notifications_user_created
    ON notification.user_notifications (user_id, created_at DESC);

-- Bell-icon badge: `COUNT(*) WHERE user_id=$1 AND read_at IS NULL`.
-- Partial index keeps it tiny because most rows eventually get read.
CREATE INDEX idx_user_notifications_unread
    ON notification.user_notifications (user_id)
    WHERE read_at IS NULL;
