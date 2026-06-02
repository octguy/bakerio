package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	branchdb "github.com/octguy/bakerio/backend/db/sqlc/branch"
	"github.com/octguy/bakerio/backend/internal/branch/dto"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
	"github.com/octguy/bakerio/backend/pkg/dbq"
	"github.com/octguy/bakerio/backend/pkg/txmanager"
)

type BranchRepository interface {
	CreateBranch(ctx context.Context, name, address string, lat, lng *float64) (*domain.Branch, error)
	GetBranchByID(ctx context.Context, id uuid.UUID) (*domain.Branch, error)
	GetAllBranches(ctx context.Context) ([]*domain.Branch, error)
	ListBranches(ctx context.Context, limit, offset int32) ([]*domain.Branch, error)
	CountBranches(ctx context.Context) (int64, error)
	SearchBranches(ctx context.Context, f dto.BranchListFilter, limit, offset int32) ([]*domain.Branch, error)
	CountSearchBranches(ctx context.Context, f dto.BranchListFilter) (int64, error)
	UpdateBranch(ctx context.Context, branchID uuid.UUID, name, address string, lat, lng *float64) (*domain.Branch, error)
	UpdateBranchStatus(ctx context.Context, branchID uuid.UUID, status string) error
}

type branchRepo struct {
	db   *branchdb.Queries
	pool *pgxpool.Pool // for dynamic search queries (sqlc doesn't model multi-optional WHERE)
}

func (r *branchRepo) queries(ctx context.Context) *branchdb.Queries {
	if tx, ok := txmanager.Extract(ctx); ok {
		return r.db.WithTx(tx)
	}
	return r.db
}

func NewBranchRepository(pool *pgxpool.Pool) BranchRepository {
	return &branchRepo{db: branchdb.New(pool), pool: pool}
}

// branchSearchWhere is the shared dynamic-WHERE for both SearchBranches and
// CountSearchBranches so the two queries are guaranteed to filter identically.
func branchSearchWhere(f dto.BranchListFilter) *dbq.Where {
	w := dbq.NewWhere()
	if f.Q != "" {
		n := w.Next()
		w.AddRaw(fmt.Sprintf("(name ILIKE $%d OR address ILIKE $%d)", n, n), "%"+f.Q+"%")
	}
	w.AddIfNotEmpty("status = ", f.Status)
	return w
}

func (b *branchRepo) SearchBranches(ctx context.Context, f dto.BranchListFilter, limit, offset int32) ([]*domain.Branch, error) {
	w := branchSearchWhere(f)
	limitN := w.Next()
	offsetN := limitN + 1
	args := append(w.Args(), limit, offset)
	sql := "SELECT id, name, address, lat, lng, status, created_at FROM branch.branches" +
		w.SQL() +
		fmt.Sprintf(" ORDER BY created_at DESC LIMIT $%d OFFSET $%d", limitN, offsetN)

	rows, err := b.pool.Query(ctx, sql, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []*domain.Branch
	for rows.Next() {
		var row branchdb.BranchBranch
		if err := rows.Scan(&row.ID, &row.Name, &row.Address, &row.Lat, &row.Lng, &row.Status, &row.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, toEntity(row))
	}
	if rows.Err() != nil {
		return nil, rows.Err()
	}
	return out, nil
}

func (b *branchRepo) CountSearchBranches(ctx context.Context, f dto.BranchListFilter) (int64, error) {
	w := branchSearchWhere(f)
	sql := "SELECT COUNT(*) FROM branch.branches" + w.SQL()
	var total int64
	if err := b.pool.QueryRow(ctx, sql, w.Args()...).Scan(&total); err != nil {
		return 0, err
	}
	return total, nil
}

func (b *branchRepo) CreateBranch(ctx context.Context, name, address string, lat, lng *float64) (*domain.Branch, error) {
	q := b.queries(ctx)
	row, err := q.CreateBranch(ctx, branchdb.CreateBranchParams{
		Name:    name,
		Address: address,
		Lat:     lat,
		Lng:     lng,
	})

	if err != nil {
		return nil, err
	}

	return toEntity(row), nil
}

func (b *branchRepo) GetBranchByID(ctx context.Context, id uuid.UUID) (*domain.Branch, error) {
	q := b.queries(ctx)

	row, err := q.GetBranchByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	return toEntity(row), nil
}

func (b *branchRepo) GetAllBranches(ctx context.Context) ([]*domain.Branch, error) {
	q := b.queries(ctx)

	rows, err := q.GetAllBranches(ctx)
	if err != nil {
		return nil, err
	}

	branches := make([]*domain.Branch, 0, len(rows))

	for _, row := range rows {
		r := row

		branches = append(branches, toEntity(r))
	}

	return branches, nil
}

func (b *branchRepo) ListBranches(ctx context.Context, limit, offset int32) ([]*domain.Branch, error) {
	rows, err := b.queries(ctx).ListBranchesPaginated(ctx, branchdb.ListBranchesPaginatedParams{
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		return nil, err
	}
	branches := make([]*domain.Branch, 0, len(rows))
	for _, row := range rows {
		branches = append(branches, toEntity(row))
	}
	return branches, nil
}

func (b *branchRepo) CountBranches(ctx context.Context) (int64, error) {
	return b.queries(ctx).CountBranches(ctx)
}

func (b *branchRepo) UpdateBranch(ctx context.Context, id uuid.UUID, name, address string, lat, lng *float64) (*domain.Branch, error) {
	q := b.queries(ctx)

	row, err := q.UpdateBranch(ctx, branchdb.UpdateBranchParams{
		Name:    name,
		Address: address,
		Lat:     lat,
		Lng:     lng,
		ID:      id,
	})
	if err != nil {
		return nil, err
	}
	return toEntity(row), nil
}

func (b *branchRepo) UpdateBranchStatus(ctx context.Context, id uuid.UUID, status string) error {
	q := b.queries(ctx)

	err := q.UpdateBranchStatus(ctx, branchdb.UpdateBranchStatusParams{
		Status: status,
		ID:     id,
	})
	if err != nil {
		return err
	}
	return nil
}

func toEntity(dbModel branchdb.BranchBranch) *domain.Branch {
	return &domain.Branch{
		ID:        dbModel.ID,
		Name:      dbModel.Name,
		Address:   dbModel.Address,
		Lat:       dbModel.Lat,
		Lng:       dbModel.Lng,
		Status:    dbModel.Status,
		CreatedAt: dbModel.CreatedAt,
	}
}
