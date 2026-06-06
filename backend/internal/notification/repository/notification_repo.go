package repository

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	notificationdb "github.com/octguy/bakerio/backend/db/sqlc/notification"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
)

type NotificationRepository interface {
	Insert(ctx context.Context, p InsertParams) (domain.UserNotification, error)
	GetByID(ctx context.Context, id uuid.UUID) (*domain.UserNotification, error)

	List(ctx context.Context, userID uuid.UUID, unreadFilter *bool, limit, offset int32) ([]domain.UserNotification, error)
	Count(ctx context.Context, userID uuid.UUID, unreadFilter *bool) (int64, error)
	CountUnread(ctx context.Context, userID uuid.UUID) (int64, error)

	MarkRead(ctx context.Context, id, userID uuid.UUID) (*domain.UserNotification, error)
	MarkAllRead(ctx context.Context, userID uuid.UUID) (int64, error)
}

type InsertParams struct {
	UserID uuid.UUID
	Type   string
	Title  string
	Body   string
	Data   json.RawMessage // nil → server stores '{}'
}

type repo struct {
	db *notificationdb.Queries
}

func New(pool *pgxpool.Pool) NotificationRepository {
	return &repo{db: notificationdb.New(pool)}
}

func (r *repo) Insert(ctx context.Context, p InsertParams) (domain.UserNotification, error) {
	data := []byte(p.Data)
	if len(data) == 0 {
		data = []byte("{}")
	}
	row, err := r.db.InsertUserNotification(ctx, notificationdb.InsertUserNotificationParams{
		UserID: p.UserID,
		Type:   p.Type,
		Title:  p.Title,
		Body:   p.Body,
		Data:   data,
	})
	if err != nil {
		return domain.UserNotification{}, err
	}
	return toDomain(row), nil
}

func (r *repo) GetByID(ctx context.Context, id uuid.UUID) (*domain.UserNotification, error) {
	row, err := r.db.GetUserNotificationByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	out := toDomain(row)
	return &out, nil
}

func (r *repo) List(ctx context.Context, userID uuid.UUID, unreadFilter *bool, limit, offset int32) ([]domain.UserNotification, error) {
	params := notificationdb.ListUserNotificationsParams{
		UserID: userID,
		Lim:    limit,
		Off:    offset,
	}
	if unreadFilter != nil {
		params.FilterUnread = true
		params.IsUnread = *unreadFilter
	}
	rows, err := r.db.ListUserNotifications(ctx, params)
	if err != nil {
		return nil, err
	}
	out := make([]domain.UserNotification, len(rows))
	for i, row := range rows {
		out[i] = toDomain(row)
	}
	return out, nil
}

func (r *repo) Count(ctx context.Context, userID uuid.UUID, unreadFilter *bool) (int64, error) {
	params := notificationdb.CountUserNotificationsParams{UserID: userID}
	if unreadFilter != nil {
		params.FilterUnread = true
		params.IsUnread = *unreadFilter
	}
	return r.db.CountUserNotifications(ctx, params)
}

func (r *repo) CountUnread(ctx context.Context, userID uuid.UUID) (int64, error) {
	return r.db.CountUnreadByUser(ctx, userID)
}

func (r *repo) MarkRead(ctx context.Context, id, userID uuid.UUID) (*domain.UserNotification, error) {
	row, err := r.db.MarkNotificationRead(ctx, notificationdb.MarkNotificationReadParams{
		ID:     id,
		UserID: userID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			// Either doesn't exist, isn't theirs, or was already read.
			// Service layer disambiguates.
			return nil, nil
		}
		return nil, err
	}
	out := toDomain(row)
	return &out, nil
}

func (r *repo) MarkAllRead(ctx context.Context, userID uuid.UUID) (int64, error) {
	return r.db.MarkAllNotificationsReadByUser(ctx, userID)
}

func toDomain(row notificationdb.NotificationUserNotification) domain.UserNotification {
	return domain.UserNotification{
		ID:        row.ID,
		UserID:    row.UserID,
		Type:      row.Type,
		Title:     row.Title,
		Body:      row.Body,
		Data:      json.RawMessage(row.Data),
		ReadAt:    row.ReadAt,
		CreatedAt: row.CreatedAt,
	}
}
