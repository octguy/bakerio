package repository

import (
	"context"
	"errors"
	"math/big"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgerrcode"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"

	voucherdb "github.com/octguy/bakerio/backend/db/sqlc/voucher"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
	"github.com/octguy/bakerio/backend/pkg/txmanager"
)

// ErrAlreadyRedeemed is the typed error returned by CreateRedemption when the
// UNIQUE (voucher_id, user_id) constraint fires. The order service maps this
// to a 409 STOCK_CONFLICT-style response (VOUCHER_ALREADY_USED). It travels
// out of the tx so the order/confirm caller can roll back.
var ErrAlreadyRedeemed = errors.New("voucher already redeemed by this user")

type VoucherRepository interface {
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Voucher, error)
	GetByCode(ctx context.Context, code string) (*domain.Voucher, error)

	ListVouchers(ctx context.Context, activeFilter *bool, limit, offset int32) ([]domain.Voucher, error)
	CountVouchers(ctx context.Context, activeFilter *bool) (int64, error)

	Create(ctx context.Context, p CreateVoucherParams) (*domain.Voucher, error)
	Update(ctx context.Context, id uuid.UUID, p UpdateVoucherPatch) (*domain.Voucher, error)

	CreateRedemption(ctx context.Context, voucherID, userID, orderID uuid.UUID, discount decimal.Decimal) (*domain.VoucherRedemption, error)
	GetRedemptionByUserVoucher(ctx context.Context, voucherID, userID uuid.UUID) (*domain.VoucherRedemption, error)
}

type CreateVoucherParams struct {
	Code            string
	DiscountPercent int16
	MaxDiscount     *decimal.Decimal
	MinSubtotal     *decimal.Decimal
	ValidFrom       time.Time
	ValidTo         time.Time
	IsActive        bool
	CreatedBy       *uuid.UUID
}

// UpdateVoucherPatch carries optional field changes. Nil = leave alone.
// For the two nullable money columns we use a double pointer so the caller
// can disambiguate "don't touch" (nil) from "set to NULL" (pointer to nil).
type UpdateVoucherPatch struct {
	DiscountPercent *int16
	MaxDiscount     **decimal.Decimal
	MinSubtotal     **decimal.Decimal
	ValidFrom       *time.Time
	ValidTo         *time.Time
	IsActive        *bool
	UpdatedBy       *uuid.UUID
}

type voucherRepo struct {
	db   *voucherdb.Queries
	pool *pgxpool.Pool
}

func NewVoucherRepository(db *voucherdb.Queries, pool *pgxpool.Pool) VoucherRepository {
	return &voucherRepo{db: db, pool: pool}
}

func (r *voucherRepo) queries(ctx context.Context) *voucherdb.Queries {
	if tx, ok := txmanager.Extract(ctx); ok {
		return r.db.WithTx(tx)
	}
	return r.db
}

func (r *voucherRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Voucher, error) {
	row, err := r.queries(ctx).GetVoucherByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	v := toVoucher(row)
	return &v, nil
}

func (r *voucherRepo) GetByCode(ctx context.Context, code string) (*domain.Voucher, error) {
	row, err := r.queries(ctx).GetVoucherByCode(ctx, code)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	v := toVoucher(row)
	return &v, nil
}

func (r *voucherRepo) ListVouchers(ctx context.Context, activeFilter *bool, limit, offset int32) ([]domain.Voucher, error) {
	params := voucherdb.ListVouchersParams{Lim: limit, Off: offset}
	if activeFilter != nil {
		params.FilterActive = true
		params.IsActive = *activeFilter
	}
	rows, err := r.queries(ctx).ListVouchers(ctx, params)
	if err != nil {
		return nil, err
	}
	out := make([]domain.Voucher, len(rows))
	for i, row := range rows {
		out[i] = toVoucher(row)
	}
	return out, nil
}

func (r *voucherRepo) CountVouchers(ctx context.Context, activeFilter *bool) (int64, error) {
	params := voucherdb.CountVouchersParams{}
	if activeFilter != nil {
		params.FilterActive = true
		params.IsActive = *activeFilter
	}
	return r.queries(ctx).CountVouchers(ctx, params)
}

func (r *voucherRepo) Create(ctx context.Context, p CreateVoucherParams) (*domain.Voucher, error) {
	row, err := r.queries(ctx).CreateVoucher(ctx, voucherdb.CreateVoucherParams{
		Code:            p.Code,
		DiscountPercent: p.DiscountPercent,
		MaxDiscount:     p.MaxDiscount,
		MinSubtotal:     p.MinSubtotal,
		ValidFrom:       p.ValidFrom,
		ValidTo:         p.ValidTo,
		IsActive:        p.IsActive,
		CreatedBy:       p.CreatedBy,
	})
	if err != nil {
		return nil, err
	}
	v := toVoucher(row)
	return &v, nil
}

func (r *voucherRepo) Update(ctx context.Context, id uuid.UUID, p UpdateVoucherPatch) (*domain.Voucher, error) {
	params := voucherdb.UpdateVoucherParams{ID: id, UpdatedBy: p.UpdatedBy}
	if p.DiscountPercent != nil {
		params.SetPercent = true
		params.DiscountPercent = *p.DiscountPercent
	}
	if p.MaxDiscount != nil {
		params.SetMaxDiscount = true
		params.MaxDiscount = decimalPtrToNumeric(*p.MaxDiscount)
	}
	if p.MinSubtotal != nil {
		params.SetMinSubtotal = true
		params.MinSubtotal = decimalPtrToNumeric(*p.MinSubtotal)
	}
	if p.ValidFrom != nil {
		params.SetValidFrom = true
		params.ValidFrom = *p.ValidFrom
	}
	if p.ValidTo != nil {
		params.SetValidTo = true
		params.ValidTo = *p.ValidTo
	}
	if p.IsActive != nil {
		params.SetIsActive = true
		params.IsActive = *p.IsActive
	}
	row, err := r.queries(ctx).UpdateVoucher(ctx, params)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	v := toVoucher(row)
	return &v, nil
}

func (r *voucherRepo) CreateRedemption(ctx context.Context, voucherID, userID, orderID uuid.UUID, discount decimal.Decimal) (*domain.VoucherRedemption, error) {
	row, err := r.queries(ctx).CreateRedemption(ctx, voucherdb.CreateRedemptionParams{
		VoucherID:      voucherID,
		UserID:         userID,
		OrderID:        orderID,
		DiscountAmount: discount,
	})
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == pgerrcode.UniqueViolation {
			return nil, ErrAlreadyRedeemed
		}
		return nil, err
	}
	return toRedemptionPtr(row), nil
}

func (r *voucherRepo) GetRedemptionByUserVoucher(ctx context.Context, voucherID, userID uuid.UUID) (*domain.VoucherRedemption, error) {
	row, err := r.queries(ctx).GetRedemptionByUserVoucher(ctx, voucherdb.GetRedemptionByUserVoucherParams{
		VoucherID: voucherID,
		UserID:    userID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return toRedemptionPtr(row), nil
}

// ── mappers ─────────────────────────────────────────────────────────────────

func toVoucher(v voucherdb.VoucherVoucher) domain.Voucher {
	return domain.Voucher{
		ID:              v.ID,
		Code:            v.Code,
		DiscountPercent: v.DiscountPercent,
		MaxDiscount:     v.MaxDiscount,
		MinSubtotal:     v.MinSubtotal,
		ValidFrom:       v.ValidFrom,
		ValidTo:         v.ValidTo,
		IsActive:        v.IsActive,
		CreatedAt:       v.CreatedAt,
		UpdatedAt:       v.UpdatedAt,
	}
}

func toRedemptionPtr(r voucherdb.VoucherRedemption) *domain.VoucherRedemption {
	return &domain.VoucherRedemption{
		ID:             r.ID,
		VoucherID:      r.VoucherID,
		UserID:         r.UserID,
		OrderID:        r.OrderID,
		DiscountAmount: r.DiscountAmount,
		RedeemedAt:     r.RedeemedAt,
	}
}

// decimalPtrToNumeric maps a *decimal.Decimal to pgtype.Numeric for the
// nullable narg parameters in UpdateVoucher. nil → NULL; non-nil → set.
// Implemented inline because no other module needs this yet.
func decimalPtrToNumeric(d *decimal.Decimal) pgtype.Numeric {
	if d == nil {
		return pgtype.Numeric{Valid: false}
	}
	coef := new(big.Int)
	coef.SetString(d.Coefficient().String(), 10)
	return pgtype.Numeric{
		Int:   coef,
		Exp:   d.Exponent(),
		Valid: true,
	}
}
