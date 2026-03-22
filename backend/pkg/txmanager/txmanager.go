package txmanager

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type contextKey struct{}

type TxManager struct {
	pool *pgxpool.Pool
}

func New(pool *pgxpool.Pool) *TxManager {
	return &TxManager{pool: pool}
}

// WithTx runs fn inside a single transaction.
// The transaction is injected into ctx so any repository that calls Extract
// will automatically use it instead of the pool.
// Rolls back on error, commits on success.
func (m *TxManager) WithTx(ctx context.Context, fn func(ctx context.Context) error) error {
	tx, err := m.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}

	if err := fn(context.WithValue(ctx, contextKey{}, tx)); err != nil {
		_ = tx.Rollback(ctx)
		return err
	}

	return tx.Commit(ctx)
}

// Extract returns the pgx.Tx stored in ctx by WithTx, if any.
func Extract(ctx context.Context) (pgx.Tx, bool) {
	tx, ok := ctx.Value(contextKey{}).(pgx.Tx)
	fmt.Println("Through the extract")
	return tx, ok
}
