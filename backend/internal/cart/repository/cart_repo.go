package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	cartdb "github.com/octguy/bakerio/backend/db/sqlc/cart"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
	"github.com/octguy/bakerio/backend/pkg/txmanager"
	"github.com/shopspring/decimal"
)

type CartRepository interface {
	GetCartByUser(ctx context.Context, userID uuid.UUID) (*domain.Cart, error)
	CreateCart(ctx context.Context, userID uuid.UUID) (*domain.Cart, error)
	UpsertItem(ctx context.Context, cartID, productID uuid.UUID, qty int32, price decimal.Decimal) (*domain.CartItem, error)
	SetItemQuantity(ctx context.Context, cartID, productID uuid.UUID, qty int32, price decimal.Decimal) (*domain.CartItem, error)
	DeleteItem(ctx context.Context, cartID, productID uuid.UUID) error
	ListItems(ctx context.Context, cartID uuid.UUID) ([]*domain.CartItem, error)
	ClearItems(ctx context.Context, cartID uuid.UUID) error

	// By cart-item id (cart_id is in the WHERE clause too, so callers can't
	// touch items in another user's cart). Both return nil on not-found.
	SetItemQuantityByID(ctx context.Context, itemID, cartID uuid.UUID, qty int32) (*domain.CartItem, error)
	DeleteItemByID(ctx context.Context, itemID, cartID uuid.UUID) (bool, error)
}

type cartRepo struct {
	db *cartdb.Queries
}

func NewCartRepository(db *cartdb.Queries) CartRepository {
	return &cartRepo{db: db}
}

func (r *cartRepo) queries(ctx context.Context) *cartdb.Queries {
	if tx, ok := txmanager.Extract(ctx); ok {
		return r.db.WithTx(tx)
	}
	return r.db
}

func (r *cartRepo) GetCartByUser(ctx context.Context, userID uuid.UUID) (*domain.Cart, error) {
	row, err := r.queries(ctx).GetCartByUser(ctx, userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return toCartEntity(&row), nil
}

func (r *cartRepo) CreateCart(ctx context.Context, userID uuid.UUID) (*domain.Cart, error) {
	row, err := r.queries(ctx).CreateCart(ctx, userID)
	if err != nil {
		return nil, err
	}
	return toCartEntity(&row), nil
}

func (r *cartRepo) UpsertItem(ctx context.Context, cartID, productID uuid.UUID, qty int32, price decimal.Decimal) (*domain.CartItem, error) {
	row, err := r.queries(ctx).UpsertCartItem(ctx, cartdb.UpsertCartItemParams{
		CartID:        cartID,
		ProductID:     productID,
		Quantity:      qty,
		UnitPriceSnap: price,
	})
	if err != nil {
		return nil, err
	}
	return toItemEntity(&row), nil
}

func (r *cartRepo) SetItemQuantity(ctx context.Context, cartID, productID uuid.UUID, qty int32, price decimal.Decimal) (*domain.CartItem, error) {
	row, err := r.queries(ctx).SetCartItemQuantity(ctx, cartdb.SetCartItemQuantityParams{
		CartID:        cartID,
		ProductID:     productID,
		Quantity:      qty,
		UnitPriceSnap: price,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return toItemEntity(&row), nil
}

func (r *cartRepo) DeleteItem(ctx context.Context, cartID, productID uuid.UUID) error {
	return r.queries(ctx).DeleteCartItem(ctx, cartdb.DeleteCartItemParams{CartID: cartID, ProductID: productID})
}

func (r *cartRepo) ListItems(ctx context.Context, cartID uuid.UUID) ([]*domain.CartItem, error) {
	rows, err := r.queries(ctx).ListCartItems(ctx, cartID)
	if err != nil {
		return nil, err
	}
	out := make([]*domain.CartItem, 0, len(rows))
	for i := range rows {
		out = append(out, toItemEntity(&rows[i]))
	}
	return out, nil
}

func (r *cartRepo) ClearItems(ctx context.Context, cartID uuid.UUID) error {
	return r.queries(ctx).ClearCartItems(ctx, cartID)
}

func (r *cartRepo) SetItemQuantityByID(ctx context.Context, itemID, cartID uuid.UUID, qty int32) (*domain.CartItem, error) {
	row, err := r.queries(ctx).SetCartItemQuantityByID(ctx, cartdb.SetCartItemQuantityByIDParams{
		ID:       itemID,
		CartID:   cartID,
		Quantity: qty,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return toItemEntity(&row), nil
}

func (r *cartRepo) DeleteItemByID(ctx context.Context, itemID, cartID uuid.UUID) (bool, error) {
	_, err := r.queries(ctx).DeleteCartItemByID(ctx, cartdb.DeleteCartItemByIDParams{
		ID:     itemID,
		CartID: cartID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

func toCartEntity(c *cartdb.CartCart) *domain.Cart {
	return &domain.Cart{
		ID:        c.ID,
		UserID:    c.UserID,
		CreatedAt: c.CreatedAt,
		UpdatedAt: c.UpdatedAt,
	}
}

func toItemEntity(i *cartdb.CartCartItem) *domain.CartItem {
	return &domain.CartItem{
		ID:            i.ID,
		CartID:        i.CartID,
		ProductID:     i.ProductID,
		Quantity:      i.Quantity,
		UnitPriceSnap: i.UnitPriceSnap,
		AddedAt:       i.AddedAt,
	}
}
