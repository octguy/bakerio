package service

import (
	"context"

	"github.com/google/uuid"

	"github.com/octguy/bakerio/backend/internal/notification/dto"
	"github.com/octguy/bakerio/backend/internal/notification/repository"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
	"github.com/octguy/bakerio/backend/pkg/pagination"
)

// QueryService is the customer-facing read/mutate facade for the bell icon.
// Every method takes callerID — the handler reads it from authcontext and
// the service uses it as the scope so users can't read or mutate each
// other's notifications.
type QueryService interface {
	List(ctx context.Context, callerID uuid.UUID, unreadOnly *bool, p pagination.Params) (dto.NotificationListResponse, error)
	UnreadCount(ctx context.Context, callerID uuid.UUID) (int64, error)
	MarkRead(ctx context.Context, callerID, notificationID uuid.UUID) (dto.NotificationResponse, error)
	MarkAllRead(ctx context.Context, callerID uuid.UUID) (int64, error)
}

type queryService struct {
	repo repository.NotificationRepository
}

func NewQueryService(repo repository.NotificationRepository) QueryService {
	return &queryService{repo: repo}
}

func (s *queryService) List(ctx context.Context, callerID uuid.UUID, unreadOnly *bool, p pagination.Params) (dto.NotificationListResponse, error) {
	items, err := s.repo.List(ctx, callerID, unreadOnly, int32(p.Size), int32(p.Offset()))
	if err != nil {
		return dto.NotificationListResponse{}, apperrors.Internal("failed to list notifications", err)
	}
	total, err := s.repo.Count(ctx, callerID, unreadOnly)
	if err != nil {
		return dto.NotificationListResponse{}, apperrors.Internal("failed to count notifications", err)
	}
	out := make([]dto.NotificationResponse, len(items))
	for i, n := range items {
		out[i] = toDTO(n)
	}
	return dto.NotificationListResponse{Items: out, Meta: pagination.NewMeta(p, total)}, nil
}

func (s *queryService) UnreadCount(ctx context.Context, callerID uuid.UUID) (int64, error) {
	c, err := s.repo.CountUnread(ctx, callerID)
	if err != nil {
		return 0, apperrors.Internal("failed to count unread", err)
	}
	return c, nil
}

func (s *queryService) MarkRead(ctx context.Context, callerID, id uuid.UUID) (dto.NotificationResponse, error) {
	n, err := s.repo.MarkRead(ctx, id, callerID)
	if err != nil {
		return dto.NotificationResponse{}, apperrors.Internal("failed to mark notification read", err)
	}
	if n == nil {
		// Disambiguate "already read" (200 with current row) vs "not yours/missing" (404).
		existing, err := s.repo.GetByID(ctx, id)
		if err != nil {
			return dto.NotificationResponse{}, apperrors.Internal("failed to load notification", err)
		}
		if existing == nil || existing.UserID != callerID {
			return dto.NotificationResponse{}, apperrors.NotFound("notification not found")
		}
		return toDTO(*existing), nil
	}
	return toDTO(*n), nil
}

func (s *queryService) MarkAllRead(ctx context.Context, callerID uuid.UUID) (int64, error) {
	n, err := s.repo.MarkAllRead(ctx, callerID)
	if err != nil {
		return 0, apperrors.Internal("failed to mark all read", err)
	}
	return n, nil
}

func toDTO(n domain.UserNotification) dto.NotificationResponse {
	return dto.NotificationResponse{
		ID:        n.ID,
		Type:      n.Type,
		Title:     n.Title,
		Body:      n.Body,
		Data:      n.Data,
		ReadAt:    n.ReadAt,
		CreatedAt: n.CreatedAt,
	}
}
