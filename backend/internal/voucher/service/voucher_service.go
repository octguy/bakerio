package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"

	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
	"github.com/octguy/bakerio/backend/internal/voucher/dto"
	"github.com/octguy/bakerio/backend/internal/voucher/repository"
)

// Service is the cross-module facade other modules call. The order module
// uses Validate at /orders/select-branch and Redeem at /orders/confirm.
type Service interface {
	Validate(ctx context.Context, code string, userID uuid.UUID, subtotal decimal.Decimal) (dto.ValidationResult, error)
	Redeem(ctx context.Context, voucherID, userID, orderID uuid.UUID, discount decimal.Decimal) error

	// Admin / management surface.
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Voucher, error)
	List(ctx context.Context, activeFilter *bool, limit, offset int32) (items []domain.Voucher, total int64, err error)
	Create(ctx context.Context, p repository.CreateVoucherParams) (*domain.Voucher, error)
	Update(ctx context.Context, id uuid.UUID, patch repository.UpdateVoucherPatch) (*domain.Voucher, error)
}

type service struct {
	repo repository.VoucherRepository
	now  func() time.Time // injectable for tests; defaults to time.Now
}

func NewService(repo repository.VoucherRepository) Service {
	return &service{repo: repo, now: time.Now}
}

// NormalizeCode is the rule for matching customer input to stored codes. Stored
// codes are uppercase (per the doc); the user can type any case + surrounding
// whitespace. Exposed so seeds + admin endpoints stay consistent.
func NormalizeCode(code string) string {
	return strings.ToUpper(strings.TrimSpace(code))
}

// Validate runs every business check on a code without committing anything.
// Returns the voucher + computed discount on success. Each failure carries a
// distinct AppError type so the HTTP layer maps them to 404/409/422 cleanly.
func (s *service) Validate(ctx context.Context, code string, userID uuid.UUID, subtotal decimal.Decimal) (dto.ValidationResult, error) {
	normalized := NormalizeCode(code)
	if normalized == "" {
		return dto.ValidationResult{}, apperrors.Validation("voucher code is required")
	}

	v, err := s.repo.GetByCode(ctx, normalized)
	if err != nil {
		return dto.ValidationResult{}, apperrors.Internal("failed to load voucher", err)
	}
	if v == nil {
		return dto.ValidationResult{}, apperrors.NotFound("VOUCHER_NOT_FOUND")
	}

	if !v.IsActive {
		return dto.ValidationResult{}, apperrors.Validation("VOUCHER_INACTIVE")
	}

	now := s.now()
	if now.Before(v.ValidFrom) || now.After(v.ValidTo) {
		return dto.ValidationResult{}, apperrors.Validation("VOUCHER_EXPIRED")
	}

	if v.MinSubtotal != nil && subtotal.LessThan(*v.MinSubtotal) {
		return dto.ValidationResult{}, apperrors.Validation("VOUCHER_MIN_SUBTOTAL")
	}

	// Informational pre-check — the unique constraint in voucher.redemptions
	// is what actually enforces it under concurrency. See V5/M4.
	prior, err := s.repo.GetRedemptionByUserVoucher(ctx, v.ID, userID)
	if err != nil {
		return dto.ValidationResult{}, apperrors.Internal("failed to check redemption history", err)
	}
	if prior != nil {
		return dto.ValidationResult{}, apperrors.VoucherAlreadyUsed("VOUCHER_ALREADY_USED")
	}

	return dto.ValidationResult{Voucher: *v, Discount: computeDiscount(subtotal, *v)}, nil
}

// Redeem is called from inside /orders/confirm's tx. Caller passes the
// already-validated voucherID + the discount it computed at select-branch
// time (snapshotted in the Redis session), so the math can't drift between
// the two requests. On unique-violation → VoucherAlreadyUsed; the order
// service rolls the tx back and returns 409.
func (s *service) Redeem(ctx context.Context, voucherID, userID, orderID uuid.UUID, discount decimal.Decimal) error {
	_, err := s.repo.CreateRedemption(ctx, voucherID, userID, orderID, discount)
	if err != nil {
		if errors.Is(err, repository.ErrAlreadyRedeemed) {
			return apperrors.VoucherAlreadyUsed("VOUCHER_ALREADY_USED")
		}
		return apperrors.Internal("failed to record redemption", err)
	}
	return nil
}

// ── Admin pass-throughs ─────────────────────────────────────────────────────

func (s *service) GetByID(ctx context.Context, id uuid.UUID) (*domain.Voucher, error) {
	v, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, apperrors.Internal("failed to load voucher", err)
	}
	if v == nil {
		return nil, apperrors.NotFound("voucher not found")
	}
	return v, nil
}

func (s *service) List(ctx context.Context, activeFilter *bool, limit, offset int32) ([]domain.Voucher, int64, error) {
	items, err := s.repo.ListVouchers(ctx, activeFilter, limit, offset)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list vouchers", err)
	}
	total, err := s.repo.CountVouchers(ctx, activeFilter)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to count vouchers", err)
	}
	return items, total, nil
}

func (s *service) Create(ctx context.Context, p repository.CreateVoucherParams) (*domain.Voucher, error) {
	p.Code = NormalizeCode(p.Code)
	if p.Code == "" {
		return nil, apperrors.Validation("voucher code is required")
	}
	v, err := s.repo.Create(ctx, p)
	if err != nil {
		if errors.Is(err, repository.ErrCodeTaken) {
			return nil, apperrors.Conflict("voucher code already exists")
		}
		return nil, apperrors.Internal("failed to create voucher", err)
	}
	return v, nil
}

func (s *service) Update(ctx context.Context, id uuid.UUID, patch repository.UpdateVoucherPatch) (*domain.Voucher, error) {
	v, err := s.repo.Update(ctx, id, patch)
	if err != nil {
		return nil, apperrors.Internal("failed to update voucher", err)
	}
	if v == nil {
		return nil, apperrors.NotFound("voucher not found")
	}
	return v, nil
}

// computeDiscount is the math from documents/business/voucher-membership.md
// §1.3. Exposed at package level so unit tests can reach it without spinning
// up a service.
func computeDiscount(subtotal decimal.Decimal, v domain.Voucher) decimal.Decimal {
	raw := subtotal.Mul(decimal.NewFromInt(int64(v.DiscountPercent))).Div(decimal.NewFromInt(100)).Floor()
	if v.MaxDiscount != nil && raw.GreaterThan(*v.MaxDiscount) {
		return *v.MaxDiscount
	}
	return raw
}
