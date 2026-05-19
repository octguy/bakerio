package repository

import (
	"context"

	"github.com/google/uuid"
	authdb "github.com/octguy/bakerio/backend/db/sqlc/auth"
	"github.com/octguy/bakerio/backend/internal/shared/authcontext"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
	"github.com/octguy/bakerio/backend/pkg/txmanager"
)

type AuthRepository interface {
	CreateAccount(ctx context.Context, email, password string, branchID *uuid.UUID) (*domain.User, error)
	FindUserByEmail(ctx context.Context, email string) (*domain.User, error)
	FindUserByID(ctx context.Context, id uuid.UUID) (*domain.User, error)
	FindUserWithCredentialsByEmail(ctx context.Context, email string) (authdb.GetUserWithCredentialsByEmailRow, error)
	ActivateUser(ctx context.Context, id uuid.UUID) error
	GetCredentialsByUserID(ctx context.Context, userID uuid.UUID) (string, error)
	UpdatePassword(ctx context.Context, userID uuid.UUID, newHash string) error
	GetUserBranchID(ctx context.Context, id uuid.UUID) (*uuid.UUID, error)
	UpdateUserBranchID(ctx context.Context, userID uuid.UUID, branchID *uuid.UUID) error
}

type authRepo struct {
	db *authdb.Queries
}

func NewAuthRepo(db *authdb.Queries) AuthRepository {
	return &authRepo{
		db: db,
	}
}

func (r *authRepo) queries(ctx context.Context) *authdb.Queries {
	if tx, ok := txmanager.Extract(ctx); ok {
		return r.db.WithTx(tx)
	}
	return r.db
}

func (r *authRepo) CreateAccount(ctx context.Context, email, password string, branchID *uuid.UUID) (*domain.User, error) {
	callerID, _ := authcontext.CallerID(ctx)
	q := r.queries(ctx)

	row, err := q.CreateUser(ctx, authdb.CreateUserParams{
		Email:         email,
		EmailVerified: false,
		IsActive:      false,
		BranchID:      branchID,
		CreatedBy:     nullableUUID(callerID),
		UpdatedBy:     nullableUUID(callerID),
	})
	if err != nil {
		return nil, err
	}

	_, err = q.CreateAuthCredential(ctx, authdb.CreateAuthCredentialParams{
		UserID:       row.ID,
		PasswordHash: password,
		CreatedBy:    nullableUUID(callerID),
		UpdatedBy:    nullableUUID(callerID),
	})

	if err != nil {
		return nil, err
	}

	return toEntity(&row), nil
}

func (r *authRepo) FindUserByEmail(ctx context.Context, email string) (*domain.User, error) {
	q := r.queries(ctx)

	row, err := q.GetUserByEmail(ctx, email)
	if err != nil {
		return nil, err
	}

	return toEntity(&row), nil
}

func (r *authRepo) FindUserByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	q := r.queries(ctx)

	row, err := q.GetUserByID(ctx, id)
	if err != nil {
		return nil, err
	}

	return toEntity(&row), nil
}

func (r *authRepo) FindUserWithCredentialsByEmail(ctx context.Context, email string) (authdb.GetUserWithCredentialsByEmailRow, error) {
	q := r.queries(ctx)

	row, err := q.GetUserWithCredentialsByEmail(ctx, email)
	if err != nil {
		return authdb.GetUserWithCredentialsByEmailRow{}, err
	}

	return row, nil
}

func (r *authRepo) ActivateUser(ctx context.Context, id uuid.UUID) error {
	q := r.queries(ctx)
	err := q.ActivateUser(ctx, id)

	if err != nil {
		return err
	}

	return nil
}

func (r *authRepo) GetCredentialsByUserID(ctx context.Context, userID uuid.UUID) (string, error) {
	return r.queries(ctx).GetCredentialsByUserID(ctx, userID)
}

func (r *authRepo) UpdatePassword(ctx context.Context, userID uuid.UUID, newHash string) error {
	callerID, _ := authcontext.CallerID(ctx)
	return r.queries(ctx).UpdatePassword(ctx, authdb.UpdatePasswordParams{
		PasswordHash: newHash,
		UpdatedBy:    nullableUUID(callerID),
		UserID:       userID,
	})
}

func (r *authRepo) GetUserBranchID(ctx context.Context, id uuid.UUID) (*uuid.UUID, error) {
	return r.queries(ctx).GetUserBranchID(ctx, id)
}

func (r *authRepo) UpdateUserBranchID(ctx context.Context, userID uuid.UUID, branchID *uuid.UUID) error {
	return r.queries(ctx).UpdateUserBranchID(ctx, authdb.UpdateUserBranchIDParams{
		ID:       userID,
		BranchID: branchID,
	})
}

func toEntity(u *authdb.AuthUser) *domain.User {
	return &domain.User{
		ID:            u.ID,
		Email:         u.Email,
		EmailVerified: u.EmailVerified,
		IsActive:      u.IsActive,
		BranchID:      u.BranchID,
		CreatedAt:     u.CreatedAt,
		UpdatedAt:     u.UpdatedAt,
		DeletedAt:     u.DeletedAt,
		CreatedBy:     u.CreatedBy,
		UpdatedBy:     u.UpdatedBy,
	}
}

func nullableUUID(id uuid.UUID) *uuid.UUID {
	if id == uuid.Nil {
		return nil
	}
	return &id
}
