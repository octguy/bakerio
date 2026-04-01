package outbox

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/octguy/bakerio/backend/pkg/txmanager"
)

type Event struct {
	ID         uuid.UUID
	RoutingKey string
	Payload    []byte
	CreatedAt  time.Time
}

// Source is implemented by Repository. The worker depends on this interface.
type Source interface {
	Save(ctx context.Context, routingKey string, payload any) error
	FetchUnpublished(ctx context.Context, limit int) ([]Event, error)
	MarkPublished(ctx context.Context, id uuid.UUID) error
}

// Repository is generic — configure it with any schema-qualified table name.
//
//	outbox.NewRepository(pool, "auth.outbox")
//	outbox.NewRepository(pool, "order.outbox")
type Repository struct {
	pool  *pgxpool.Pool
	table string
}

func NewRepository(pool *pgxpool.Pool, table string) *Repository {
	return &Repository{pool: pool, table: table}
}

// Save inserts an event into the outbox table.
// Must be called inside tx.WithTx — the INSERT shares the transaction with the
// business writes (CreateAccount, CreateProfile) making all three atomic.
//
// txmanager.Extract returns the pgx.Tx injected by WithTx.
// Both pgx.Tx and *pgxpool.Pool expose the same Exec method, so we branch
// on whether a transaction is active and use whichever is appropriate.
func (r *Repository) Save(ctx context.Context, routingKey string, payload any) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	q := fmt.Sprintf(`INSERT INTO %s (routing_key, payload) VALUES ($1, $2)`, r.table)

	if tx, ok := txmanager.Extract(ctx); ok {
		_, err = tx.Exec(ctx, q, routingKey, body)
	} else {
		_, err = r.pool.Exec(ctx, q, routingKey, body)
	}

	return err
}

// FetchUnpublished returns up to limit unpublished events ordered by creation time.
func (r *Repository) FetchUnpublished(ctx context.Context, limit int) ([]Event, error) {
	rows, err := r.pool.Query(ctx,
		fmt.Sprintf(`
			SELECT id, routing_key, payload, created_at
            FROM %s
            WHERE published_at IS NULL
            ORDER BY created_at
            LIMIT $1
        `, r.table),
		limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []Event
	for rows.Next() {
		var e Event
		if err := rows.Scan(&e.ID, &e.RoutingKey, &e.Payload, &e.CreatedAt); err != nil {
			return nil, err
		}
		events = append(events, e)
	}

	return events, nil
}

// MarkPublished stamps published_at so the worker skips it on the next poll.
func (r *Repository) MarkPublished(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx,
		fmt.Sprintf(`UPDATE %s SET published_at = NOW() WHERE id = $1`, r.table),
		id,
	)
	return err
}
