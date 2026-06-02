package service

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
	"github.com/octguy/bakerio/backend/internal/user/dto"
	"github.com/octguy/bakerio/backend/internal/user/repository"
	"github.com/octguy/bakerio/backend/pkg/txmanager"
)

type AddressService interface {
	List(ctx context.Context, userID uuid.UUID) (dto.AddressListResponse, error)
	Get(ctx context.Context, userID, id uuid.UUID) (dto.AddressResponse, error)
	Create(ctx context.Context, userID uuid.UUID, req dto.CreateAddressRequest) (dto.AddressResponse, error)
	Update(ctx context.Context, userID, id uuid.UUID, req dto.UpdateAddressRequest) (dto.AddressResponse, error)
	Delete(ctx context.Context, userID, id uuid.UUID) error
	SetDefault(ctx context.Context, userID, id uuid.UUID) (dto.AddressResponse, error)
}

type addressService struct {
	repo repository.AddressRepository
	tx   *txmanager.TxManager
}

func NewAddressService(tx *txmanager.TxManager, repo repository.AddressRepository) AddressService {
	return &addressService{repo: repo, tx: tx}
}

func (s *addressService) List(ctx context.Context, userID uuid.UUID) (dto.AddressListResponse, error) {
	rows, err := s.repo.List(ctx, userID)
	if err != nil {
		return dto.AddressListResponse{}, apperrors.Internal("failed to list addresses", err)
	}
	items := make([]dto.AddressResponse, 0, len(rows))
	for i := range rows {
		items = append(items, addressToResponse(&rows[i]))
	}
	return dto.AddressListResponse{Items: items}, nil
}

func (s *addressService) Get(ctx context.Context, userID, id uuid.UUID) (dto.AddressResponse, error) {
	row, err := s.repo.Get(ctx, userID, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return dto.AddressResponse{}, apperrors.NotFound("address not found")
		}
		return dto.AddressResponse{}, apperrors.Internal("failed to read address", err)
	}
	return addressToResponse(row), nil
}

// Create. If is_default=true (or the user has no addresses yet so we promote
// this one), runs inside a tx that first clears the current default. The
// partial unique index uq_users_addresses_one_default_per_user is the actual
// safety net — this code just keeps things valid without surfacing a
// constraint error to the caller.
func (s *addressService) Create(ctx context.Context, userID uuid.UUID, req dto.CreateAddressRequest) (dto.AddressResponse, error) {
	var created *domain.Address

	err := s.tx.WithTx(ctx, func(ctx context.Context) error {
		existing, err := s.repo.List(ctx, userID)
		if err != nil {
			return apperrors.Internal("failed to load addresses", err)
		}

		// Auto-default when this is the user's first address; otherwise honor
		// what the caller asked for.
		makeDefault := req.IsDefault || len(existing) == 0
		if makeDefault && len(existing) > 0 {
			if err := s.repo.ClearDefault(ctx, userID); err != nil {
				return apperrors.Internal("failed to clear default", err)
			}
		}

		row, err := s.repo.Create(ctx, userID, req.Address, req.Latitude, req.Longitude, makeDefault)
		if err != nil {
			return apperrors.Internal("failed to create address", err)
		}
		created = row
		return nil
	})
	if err != nil {
		return dto.AddressResponse{}, err
	}
	return addressToResponse(created), nil
}

// Update is geometry-only (text + lat/long). is_default is intentionally not
// patchable here — callers use PUT /addresses/{id}/default to switch it.
func (s *addressService) Update(ctx context.Context, userID, id uuid.UUID, req dto.UpdateAddressRequest) (dto.AddressResponse, error) {
	current, err := s.repo.Get(ctx, userID, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return dto.AddressResponse{}, apperrors.NotFound("address not found")
		}
		return dto.AddressResponse{}, apperrors.Internal("failed to read address", err)
	}

	addr := current.Address
	if req.Address != nil {
		addr = *req.Address
	}
	lat := current.Latitude
	if req.Latitude != nil {
		lat = *req.Latitude
	}
	lng := current.Longitude
	if req.Longitude != nil {
		lng = *req.Longitude
	}

	row, err := s.repo.Update(ctx, userID, id, addr, lat, lng)
	if err != nil {
		return dto.AddressResponse{}, apperrors.Internal("failed to update address", err)
	}
	return addressToResponse(row), nil
}

// Delete is hard delete. Orders snapshot address text + lat/lng on the order
// row, so order history is unaffected. If the deleted row was the default and
// any addresses remain, the newest one is promoted so the user always has a
// default to ship to (avoids an empty default at checkout).
func (s *addressService) Delete(ctx context.Context, userID, id uuid.UUID) error {
	return s.tx.WithTx(ctx, func(ctx context.Context) error {
		current, err := s.repo.Get(ctx, userID, id)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return apperrors.NotFound("address not found")
			}
			return apperrors.Internal("failed to read address", err)
		}

		if _, err := s.repo.Delete(ctx, userID, id); err != nil {
			return apperrors.Internal("failed to delete address", err)
		}

		if !current.IsDefault {
			return nil
		}

		// Promote the newest remaining address. List() orders by
		// is_default DESC, created_at DESC — none are default after the
		// delete, so the first row is the newest.
		remaining, err := s.repo.List(ctx, userID)
		if err != nil {
			return apperrors.Internal("failed to load addresses", err)
		}
		if len(remaining) == 0 {
			return nil
		}
		if _, err := s.repo.SetDefault(ctx, userID, remaining[0].ID); err != nil {
			return apperrors.Internal("failed to promote new default", err)
		}
		return nil
	})
}

func (s *addressService) SetDefault(ctx context.Context, userID, id uuid.UUID) (dto.AddressResponse, error) {
	var promoted *domain.Address

	err := s.tx.WithTx(ctx, func(ctx context.Context) error {
		// Confirm the address belongs to the caller before touching defaults —
		// otherwise we'd clear the real default and then fail to promote anything.
		if _, err := s.repo.Get(ctx, userID, id); err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return apperrors.NotFound("address not found")
			}
			return apperrors.Internal("failed to read address", err)
		}
		if err := s.repo.ClearDefault(ctx, userID); err != nil {
			return apperrors.Internal("failed to clear default", err)
		}
		row, err := s.repo.SetDefault(ctx, userID, id)
		if err != nil {
			return apperrors.Internal("failed to set default", err)
		}
		promoted = row
		return nil
	})
	if err != nil {
		return dto.AddressResponse{}, err
	}
	return addressToResponse(promoted), nil
}

func addressToResponse(a *domain.Address) dto.AddressResponse {
	return dto.AddressResponse{
		ID:        a.ID,
		UserID:    a.UserID,
		Address:   a.Address,
		Latitude:  a.Latitude,
		Longitude: a.Longitude,
		IsDefault: a.IsDefault,
		CreatedAt: a.CreatedAt,
		UpdatedAt: a.UpdatedAt,
	}
}
