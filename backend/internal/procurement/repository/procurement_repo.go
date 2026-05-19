package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	procurementdb "github.com/octguy/bakerio/backend/db/sqlc/procurement"
	"github.com/octguy/bakerio/backend/internal/shared/authcontext"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
	"github.com/octguy/bakerio/backend/pkg/txmanager"
)

type ProcurementRepository interface {
	CreatePO(ctx context.Context, po *domain.PurchaseOrder) (*domain.PurchaseOrder, error)
	GetPO(ctx context.Context, id uuid.UUID) (*domain.PurchaseOrder, error)
	ListPOsByBranch(ctx context.Context, branchID uuid.UUID) ([]*domain.PurchaseOrder, error)
	ListAllPOs(ctx context.Context) ([]*domain.PurchaseOrder, error)
	UpdatePOStatus(ctx context.Context, id uuid.UUID, status string, version int32) (*domain.PurchaseOrder, error)
	CreatePOItem(ctx context.Context, item *domain.POItem) (*domain.POItem, error)
	GetPOItems(ctx context.Context, poID uuid.UUID) ([]*domain.POItem, error)
}

type procurementRepo struct {
	db *procurementdb.Queries
}

func NewProcurementRepository(db *procurementdb.Queries) ProcurementRepository {
	return &procurementRepo{db: db}
}

func (r *procurementRepo) queries(ctx context.Context) *procurementdb.Queries {
	if tx, ok := txmanager.Extract(ctx); ok {
		return r.db.WithTx(tx)
	}
	return r.db
}

func (r *procurementRepo) CreatePO(ctx context.Context, po *domain.PurchaseOrder) (*domain.PurchaseOrder, error) {
	callerID, _ := authcontext.CallerID(ctx)
	row, err := r.queries(ctx).CreatePurchaseOrder(ctx, procurementdb.CreatePurchaseOrderParams{
		SupplierID:  po.SupplierID,
		BranchID:    po.BranchID,
		Status:      po.Status,
		TotalAmount: po.TotalAmount,
		Note:        po.Note,
		CreatedBy:   nullableUUID(callerID),
		UpdatedBy:   nullableUUID(callerID),
	})
	if err != nil {
		return nil, err
	}
	return toPOEntity(&row), nil
}

func (r *procurementRepo) GetPO(ctx context.Context, id uuid.UUID) (*domain.PurchaseOrder, error) {
	row, err := r.queries(ctx).GetPurchaseOrder(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return toPOEntity(&row), nil
}

func (r *procurementRepo) ListPOsByBranch(ctx context.Context, branchID uuid.UUID) ([]*domain.PurchaseOrder, error) {
	rows, err := r.queries(ctx).ListPurchaseOrdersByBranch(ctx, branchID)
	if err != nil {
		return nil, err
	}
	res := make([]*domain.PurchaseOrder, 0, len(rows))
	for _, row := range rows {
		res = append(res, toPOEntity(&row))
	}
	return res, nil
}

func (r *procurementRepo) ListAllPOs(ctx context.Context) ([]*domain.PurchaseOrder, error) {
	rows, err := r.queries(ctx).ListAllPurchaseOrders(ctx)
	if err != nil {
		return nil, err
	}
	res := make([]*domain.PurchaseOrder, 0, len(rows))
	for _, row := range rows {
		res = append(res, toPOEntity(&row))
	}
	return res, nil
}

func (r *procurementRepo) UpdatePOStatus(ctx context.Context, id uuid.UUID, status string, version int32) (*domain.PurchaseOrder, error) {
	callerID, _ := authcontext.CallerID(ctx)
	row, err := r.queries(ctx).UpdatePOStatus(ctx, procurementdb.UpdatePOStatusParams{
		ID:        id,
		Status:    status,
		UpdatedBy: nullableUUID(callerID),
		Version:   version,
	})
	if err != nil {
		return nil, err
	}
	return toPOEntity(&row), nil
}

func (r *procurementRepo) CreatePOItem(ctx context.Context, item *domain.POItem) (*domain.POItem, error) {
	row, err := r.queries(ctx).CreatePOItem(ctx, procurementdb.CreatePOItemParams{
		PoID:      item.POID,
		ProductID: item.ProductID,
		Quantity:  item.Quantity,
		UnitPrice: item.UnitPrice,
	})
	if err != nil {
		return nil, err
	}
	return toPOItemEntity(&row), nil
}

func (r *procurementRepo) GetPOItems(ctx context.Context, poID uuid.UUID) ([]*domain.POItem, error) {
	rows, err := r.queries(ctx).GetPOItems(ctx, poID)
	if err != nil {
		return nil, err
	}
	res := make([]*domain.POItem, 0, len(rows))
	for _, row := range rows {
		res = append(res, toPOItemEntity(&row))
	}
	return res, nil
}

func toPOEntity(row *procurementdb.ProcurementPurchaseOrder) *domain.PurchaseOrder {
	return &domain.PurchaseOrder{
		ID:          row.ID,
		SupplierID:  row.SupplierID,
		BranchID:    row.BranchID,
		Status:      row.Status,
		TotalAmount: row.TotalAmount,
		Note:        row.Note,
		Version:     row.Version,
		CreatedAt:   row.CreatedAt,
		UpdatedAt:   row.UpdatedAt,
		DeletedAt:   row.DeletedAt,
		CreatedBy:   row.CreatedBy,
		UpdatedBy:   row.UpdatedBy,
	}
}

func toPOItemEntity(row *procurementdb.ProcurementPoItem) *domain.POItem {
	return &domain.POItem{
		ID:         row.ID,
		POID:       row.PoID,
		ProductID:  row.ProductID,
		Quantity:   row.Quantity,
		UnitPrice:  row.UnitPrice,
		TotalPrice: row.TotalPrice,
	}
}
