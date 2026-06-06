package outbox

import (
	"context"
	"encoding/json"
	"time"

	"github.com/octguy/bakerio/backend/internal/platform/mq"
	"go.uber.org/zap"
)

type Worker struct {
	sources   []Source
	publisher *mq.Publisher
	logger    *zap.Logger
}

// NewWorker accepts one or more Sources. v1 ships a single shared
// outbox.events table, but the variadic signature lets us add per-module
// tables later (with their own polling cadence) without breaking callers.
// outbox.NewWorker(publisher, logger, outboxRepo)
func NewWorker(publisher *mq.Publisher, logger *zap.Logger, sources ...Source) *Worker {
	return &Worker{sources: sources, publisher: publisher, logger: logger}
}

func (w *Worker) Run(ctx context.Context) {
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			for _, src := range w.sources {
				w.flush(ctx, src)
			}
		}
	}
}

func (w *Worker) flush(ctx context.Context, src Source) {
	events, err := src.FetchUnpublished(ctx, 100)
	if err != nil {
		w.logger.Error("outbox: fetch failed", zap.Error(err))
		return
	}

	for _, e := range events {
		if err := w.publisher.Publish(ctx, e.RoutingKey, json.RawMessage(e.Payload)); err != nil {
			w.logger.Error("outbox: publish failed",
				zap.String("routing_key", e.RoutingKey),
				zap.Error(err),
			)
			continue // leave unpublished, retry next tick
		}
		if err := src.MarkPublished(ctx, e.ID); err != nil {
			w.logger.Warn("outbox: mark published failed",
				zap.String("id", e.ID.String()),
				zap.Error(err),
			)
		}
	}
}
