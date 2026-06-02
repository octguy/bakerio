package repository

import (
	"context"

	"github.com/google/uuid"
	usersdb "github.com/octguy/bakerio/backend/db/sqlc/users"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
	"github.com/octguy/bakerio/backend/pkg/txmanager"
)

type AddressRepository interface {
	Create(ctx context.Context, userID uuid.UUID, address string, lat, lng float64, isDefault bool) (*domain.Address, error)
	List(ctx context.Context, userID uuid.UUID) ([]domain.Address, error)
	Get(ctx context.Context, userID, id uuid.UUID) (*domain.Address, error)
	Update(ctx context.Context, userID, id uuid.UUID, address string, lat, lng float64) (*domain.Address, error)
	Delete(ctx context.Context, userID, id uuid.UUID) (int64, error)
	ClearDefault(ctx context.Context, userID uuid.UUID) error
	SetDefault(ctx context.Context, userID, id uuid.UUID) (*domain.Address, error)
}

type addressRepo struct {
	db *usersdb.Queries
}

func NewAddressRepository(db *usersdb.Queries) AddressRepository {
	return &addressRepo{db: db}
}

func (r *addressRepo) queries(ctx context.Context) *usersdb.Queries {
	if tx, ok := txmanager.Extract(ctx); ok {
		return r.db.WithTx(tx)
	}
	return r.db
}

func (r *addressRepo) Create(ctx context.Context, userID uuid.UUID, address string, lat, lng float64, isDefault bool) (*domain.Address, error) {
	row, err := r.queries(ctx).CreateAddress(ctx, usersdb.CreateAddressParams{
		UserID:    userID,
		Address:   address,
		Latitude:  lat,
		Longitude: lng,
		IsDefault: isDefault,
	})
	if err != nil {
		return nil, err
	}
	return addressToEntity(row), nil
}

func (r *addressRepo) List(ctx context.Context, userID uuid.UUID) ([]domain.Address, error) {
	rows, err := r.queries(ctx).ListAddressesByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	out := make([]domain.Address, 0, len(rows))
	for _, row := range rows {
		out = append(out, *addressToEntity(row))
	}
	return out, nil
}

func (r *addressRepo) Get(ctx context.Context, userID, id uuid.UUID) (*domain.Address, error) {
	row, err := r.queries(ctx).GetAddressByID(ctx, usersdb.GetAddressByIDParams{ID: id, UserID: userID})
	if err != nil {
		return nil, err
	}
	return addressToEntity(row), nil
}

func (r *addressRepo) Update(ctx context.Context, userID, id uuid.UUID, address string, lat, lng float64) (*domain.Address, error) {
	row, err := r.queries(ctx).UpdateAddress(ctx, usersdb.UpdateAddressParams{
		ID:        id,
		UserID:    userID,
		Address:   address,
		Latitude:  lat,
		Longitude: lng,
	})
	if err != nil {
		return nil, err
	}
	return addressToEntity(row), nil
}

func (r *addressRepo) Delete(ctx context.Context, userID, id uuid.UUID) (int64, error) {
	return r.queries(ctx).DeleteAddress(ctx, usersdb.DeleteAddressParams{ID: id, UserID: userID})
}

func (r *addressRepo) ClearDefault(ctx context.Context, userID uuid.UUID) error {
	return r.queries(ctx).ClearDefaultForUser(ctx, userID)
}

func (r *addressRepo) SetDefault(ctx context.Context, userID, id uuid.UUID) (*domain.Address, error) {
	row, err := r.queries(ctx).SetDefaultAddress(ctx, usersdb.SetDefaultAddressParams{ID: id, UserID: userID})
	if err != nil {
		return nil, err
	}
	return addressToEntity(row), nil
}

func addressToEntity(row usersdb.UsersAddress) *domain.Address {
	return &domain.Address{
		ID:        row.ID,
		UserID:    row.UserID,
		Address:   row.Address,
		Latitude:  row.Latitude,
		Longitude: row.Longitude,
		IsDefault: row.IsDefault,
		CreatedAt: row.CreatedAt,
		UpdatedAt: row.UpdatedAt,
	}
}
