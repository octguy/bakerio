-- name: InsertUserNotification :one
INSERT INTO notification.user_notifications (user_id, type, title, body, data)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetUserNotificationByID :one
SELECT * FROM notification.user_notifications
WHERE id = $1 LIMIT 1;

-- name: ListUserNotifications :many
-- The boolean "filter_unread" controls whether the query restricts to
-- read/unread; when false, "is_unread" is ignored. Mirrors the active-
-- filter pattern used in voucher + product list.
SELECT * FROM notification.user_notifications
WHERE user_id = $1
  AND (NOT sqlc.arg('filter_unread')::boolean
        OR ((read_at IS NULL) = sqlc.arg('is_unread')::boolean))
ORDER BY created_at DESC
LIMIT sqlc.arg('lim') OFFSET sqlc.arg('off');

-- name: CountUserNotifications :one
SELECT COUNT(*) FROM notification.user_notifications
WHERE user_id = $1
  AND (NOT sqlc.arg('filter_unread')::boolean
        OR ((read_at IS NULL) = sqlc.arg('is_unread')::boolean));

-- name: CountUnreadByUser :one
-- Hot path — bell-icon badge polled every ~10s. Hits the partial unread
-- index so cost is independent of total notification count.
SELECT COUNT(*) FROM notification.user_notifications
WHERE user_id = $1 AND read_at IS NULL;

-- name: MarkNotificationRead :one
-- User-scoped so an attacker can't mark someone else's notifications read
-- (returns 0 rows if id belongs to another user → handler 404s).
UPDATE notification.user_notifications
SET read_at = NOW()
WHERE id = $1 AND user_id = $2 AND read_at IS NULL
RETURNING *;

-- name: MarkAllNotificationsReadByUser :execrows
UPDATE notification.user_notifications
SET read_at = NOW()
WHERE user_id = $1 AND read_at IS NULL;
