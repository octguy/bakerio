package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/octguy/bakerio/backend/internal/user/dto"
	"github.com/octguy/bakerio/backend/pkg/dbq"
)

// UserSearchRepository runs the cross-schema search behind GET /users and GET
// /staff. It is the one place in the user module that read-joins auth +
// users + branch schemas; documented as the accepted exception to the
// schema-per-module rule (reads only, never writes).
type UserSearchRepository interface {
	SearchUsers(ctx context.Context, filter dto.UserListFilter, limit, offset int32) ([]*dto.UserSummary, error)
	CountUsers(ctx context.Context, filter dto.UserListFilter) (int64, error)
}

type userSearchRepo struct {
	pool *pgxpool.Pool
}

func NewUserSearchRepository(pool *pgxpool.Pool) UserSearchRepository {
	return &userSearchRepo{pool: pool}
}

// userSearchWhere builds the shared dynamic-WHERE clause used by both
// SearchUsers and CountUsers so the two queries filter identically.
func userSearchWhere(f dto.UserListFilter) *dbq.Where {
	w := dbq.NewWhere()
	w.AddRaw("u.deleted_at IS NULL")

	if f.Q != "" {
		n := w.Next()
		w.AddRaw(
			fmt.Sprintf("(u.email ILIKE $%d OR p.display_name ILIKE $%d)", n, n),
			"%"+f.Q+"%",
		)
	}
	if f.Role != "" {
		n := w.Next()
		w.AddRaw(fmt.Sprintf(
			"EXISTS (SELECT 1 FROM auth.user_roles ur "+
				"JOIN auth.roles r ON r.id = ur.role_id "+
				"WHERE ur.user_id = u.id AND r.name = $%d)", n),
			f.Role,
		)
	}
	if f.BranchID != nil {
		n := w.Next()
		w.AddRaw(fmt.Sprintf(
			"EXISTS (SELECT 1 FROM branch.branch_memberships bm "+
				"WHERE bm.user_id = u.id AND bm.branch_id = $%d)", n),
			*f.BranchID,
		)
	}
	if f.StaffOnly {
		// Has at least one role that isn't customer/guest.
		w.AddRaw(
			"EXISTS (SELECT 1 FROM auth.user_roles ur " +
				"JOIN auth.roles r ON r.id = ur.role_id " +
				"WHERE ur.user_id = u.id AND r.name NOT IN ('customer', 'guest'))",
		)
	}
	return w
}

func (r *userSearchRepo) SearchUsers(ctx context.Context, f dto.UserListFilter, limit, offset int32) ([]*dto.UserSummary, error) {
	w := userSearchWhere(f)
	limitN := w.Next()
	offsetN := limitN + 1
	args := append(w.Args(), limit, offset)

	// Cross-schema read (auth.users + users.profiles + branch.branch_memberships,
	// plus a correlated subquery to aggregate role names). Returns one row per
	// user; the LEFT JOINs preserve users without a profile/membership.
	sql := `
		SELECT
		  u.id,
		  u.email,
		  COALESCE(p.display_name, ''),
		  bm.branch_id,
		  COALESCE(
		    (SELECT array_agg(r.name)
		     FROM auth.user_roles ur
		     JOIN auth.roles r ON r.id = ur.role_id
		     WHERE ur.user_id = u.id),
		    '{}'::text[]
		  ) AS roles
		FROM auth.users u
		LEFT JOIN users.profiles p ON p.user_id = u.id
		LEFT JOIN branch.branch_memberships bm ON bm.user_id = u.id` +
		w.SQL() +
		fmt.Sprintf(`
		ORDER BY p.display_name NULLS LAST, u.email
		LIMIT $%d OFFSET $%d`, limitN, offsetN)

	rows, err := r.pool.Query(ctx, sql, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []*dto.UserSummary
	for rows.Next() {
		s := &dto.UserSummary{}
		var branchID *uuid.UUID
		if err := rows.Scan(&s.UserID, &s.Email, &s.DisplayName, &branchID, &s.Roles); err != nil {
			return nil, err
		}
		s.BranchID = branchID
		out = append(out, s)
	}
	return out, rows.Err()
}

func (r *userSearchRepo) CountUsers(ctx context.Context, f dto.UserListFilter) (int64, error) {
	w := userSearchWhere(f)
	sql := `SELECT COUNT(*)
		FROM auth.users u
		LEFT JOIN users.profiles p ON p.user_id = u.id
		LEFT JOIN branch.branch_memberships bm ON bm.user_id = u.id` + w.SQL()

	var total int64
	if err := r.pool.QueryRow(ctx, sql, w.Args()...).Scan(&total); err != nil {
		return 0, err
	}
	return total, nil
}
