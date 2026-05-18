package repository

import (
	"context"

	"github.com/google/uuid"
	procurementdb "github.com/octguy/bakerio/backend/db/sqlc/procurement"
	"github.com/octguy/bakerio/backend/internal/shared/authcontext"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
	"github.com/octguy/bakerio/backend/pkg/txmanager"
)

type SupplierRepository interface {
	Create(ctx context.Context, s *domain.Supplier) (*domain.Supplier, error)
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Supplier, error)
	ListByRegion(ctx context.Context, region string) ([]*domain.Supplier, error)
	Update(ctx context.Context, s *domain.Supplier) (*domain.Supplier, error)
	Delete(ctx context.Context, id uuid.UUID) error
}

type supplierRepo struct {
	db *procurementdb.Queries
}

func NewSupplierRepository(db *procurementdb.Queries) SupplierRepository {
	return &supplierRepo{db: db}
}

func (r *supplierRepo) queries(ctx context.Context) *procurementdb.Queries {
	if tx, ok := txmanager.Extract(ctx); ok {
		return r.db.WithTx(tx)
	}
	return r.db
}

func (r *supplierRepo) Create(ctx context.Context, s *domain.Supplier) (*domain.Supplier, error) {
	callerID, _ := authcontext.CallerID(ctx)
	row, err := r.queries(ctx).CreateSupplier(ctx, procurementdb.CreateSupplierParams{
		Name:        s.Name,
		ContactInfo: s.ContactInfo,
		Region:      s.Region,
		CreatedBy:   nullableUUID(callerID),
		UpdatedBy:   nullableUUID(callerID),
	})
	if err != nil {
		return nil, err
	}
	return toSupplierEntity(&row), nil
}

func (r *supplierRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Supplier, error) {
	row, err := r.queries(ctx).GetSupplierByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return toSupplierEntity(&row), nil
}

func (r *supplierRepo) ListByRegion(ctx context.Context, region string) ([]*domain.Supplier, error) {
	rows, err := r.queries(ctx).ListSuppliersByRegion(ctx, region)
	if err != nil {
		return nil, err
	}
	res := make([]*domain.Supplier, 0, len(rows))
	for _, row := range rows {
		res = append(res, toSupplierEntity(&row))
	}
	return res, nil
}

func (r *supplierRepo) Update(ctx context.Context, s *domain.Supplier) (*domain.Supplier, error) {
	callerID, _ := authcontext.CallerID(ctx)
	row, err := r.queries(ctx).UpdateSupplier(ctx, procurementdb.UpdateSupplierParams{
		ID:          s.ID,
		Name:        s.Name,
		ContactInfo: s.ContactInfo,
		Region:      s.Region,
		IsActive:    s.IsActive,
		UpdatedBy:   nullableUUID(callerID),
	})
	if err != nil {
		return nil, err
	}
	return toSupplierEntity(&row), nil
}

func (r *supplierRepo) Delete(ctx context.Context, id uuid.UUID) error {
	callerID, _ := authcontext.CallerID(ctx)
	return r.queries(ctx).SoftDeleteSupplier(ctx, procurementdb.SoftDeleteSupplierParams{
		ID:        id,
		UpdatedBy: nullableUUID(callerID),
	})
}

func toSupplierEntity(row *procurementdb.ProcurementSupplier) *domain.Supplier {
	return &domain.Supplier{
		ID:          row.ID,
		Name:        row.Name,
		ContactInfo: row.ContactInfo,
		Region:      row.Region,
		IsActive:    row.IsActive,
		CreatedAt:   row.CreatedAt,
		UpdatedAt:   row.UpdatedAt,
		DeletedAt:   row.DeletedAt,
		CreatedBy:   row.CreatedBy,
		UpdatedBy:   row.UpdatedBy,
	}
}
