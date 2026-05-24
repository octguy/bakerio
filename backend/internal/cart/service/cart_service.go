package service

import (
	"context"

	"github.com/google/uuid"
	"github.com/octguy/bakerio/backend/internal/cart/dto"
	"github.com/octguy/bakerio/backend/internal/cart/repository"
	productdto "github.com/octguy/bakerio/backend/internal/product/dto"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
	"github.com/shopspring/decimal"
)

// Catalog is the port the cart uses to validate products and read current
// prices. The product module's service satisfies it (read-only, one-way).
type Catalog interface {
	GetActiveProducts(ctx context.Context, ids []uuid.UUID) ([]productdto.ProductResponse, error)
}

type CartService interface {
	GetCart(ctx context.Context, userID uuid.UUID) (dto.CartResponse, error)
	AddItem(ctx context.Context, userID uuid.UUID, req dto.AddItemRequest) (dto.CartResponse, error)
	UpdateItem(ctx context.Context, userID, productID uuid.UUID, quantity int32) (dto.CartResponse, error)
	Clear(ctx context.Context, userID uuid.UUID) error
}

type cartService struct {
	repo    repository.CartRepository
	catalog Catalog
}

func NewCartService(repo repository.CartRepository, catalog Catalog) CartService {
	return &cartService{repo: repo, catalog: catalog}
}

func (s *cartService) getOrCreateCart(ctx context.Context, userID uuid.UUID) (*domain.Cart, error) {
	cart, err := s.repo.GetCartByUser(ctx, userID)
	if err != nil {
		return nil, apperrors.Internal("database error", err)
	}
	if cart != nil {
		return cart, nil
	}
	cart, err = s.repo.CreateCart(ctx, userID)
	if err != nil {
		return nil, apperrors.Internal("failed to create cart", err)
	}
	return cart, nil
}

func (s *cartService) activeProduct(ctx context.Context, productID uuid.UUID) (productdto.ProductResponse, error) {
	products, err := s.catalog.GetActiveProducts(ctx, []uuid.UUID{productID})
	if err != nil {
		return productdto.ProductResponse{}, apperrors.Internal("failed to read product", err)
	}
	if len(products) == 0 {
		return productdto.ProductResponse{}, apperrors.Validation("product is unavailable")
	}
	return products[0], nil
}

func (s *cartService) AddItem(ctx context.Context, userID uuid.UUID, req dto.AddItemRequest) (dto.CartResponse, error) {
	product, err := s.activeProduct(ctx, req.ProductID)
	if err != nil {
		return dto.CartResponse{}, err
	}
	cart, err := s.getOrCreateCart(ctx, userID)
	if err != nil {
		return dto.CartResponse{}, err
	}
	if _, err := s.repo.UpsertItem(ctx, cart.ID, req.ProductID, req.Quantity, product.Price); err != nil {
		return dto.CartResponse{}, apperrors.Internal("failed to add item", err)
	}
	return s.buildCart(ctx, cart)
}

func (s *cartService) UpdateItem(ctx context.Context, userID, productID uuid.UUID, quantity int32) (dto.CartResponse, error) {
	cart, err := s.repo.GetCartByUser(ctx, userID)
	if err != nil {
		return dto.CartResponse{}, apperrors.Internal("database error", err)
	}
	if cart == nil {
		return dto.CartResponse{}, apperrors.NotFound("cart is empty")
	}

	if quantity == 0 {
		if err := s.repo.DeleteItem(ctx, cart.ID, productID); err != nil {
			return dto.CartResponse{}, apperrors.Internal("failed to remove item", err)
		}
		return s.buildCart(ctx, cart)
	}

	product, err := s.activeProduct(ctx, productID)
	if err != nil {
		return dto.CartResponse{}, err
	}
	item, err := s.repo.SetItemQuantity(ctx, cart.ID, productID, quantity, product.Price)
	if err != nil {
		return dto.CartResponse{}, apperrors.Internal("failed to update item", err)
	}
	if item == nil {
		return dto.CartResponse{}, apperrors.NotFound("item not in cart")
	}
	return s.buildCart(ctx, cart)
}

func (s *cartService) Clear(ctx context.Context, userID uuid.UUID) error {
	cart, err := s.repo.GetCartByUser(ctx, userID)
	if err != nil {
		return apperrors.Internal("database error", err)
	}
	if cart == nil {
		return nil
	}
	if err := s.repo.ClearItems(ctx, cart.ID); err != nil {
		return apperrors.Internal("failed to clear cart", err)
	}
	return nil
}

func (s *cartService) GetCart(ctx context.Context, userID uuid.UUID) (dto.CartResponse, error) {
	cart, err := s.repo.GetCartByUser(ctx, userID)
	if err != nil {
		return dto.CartResponse{}, apperrors.Internal("database error", err)
	}
	if cart == nil {
		return dto.CartResponse{Items: []dto.CartItemResponse{}, Total: decimal.Zero, Count: 0}, nil
	}
	return s.buildCart(ctx, cart)
}

// buildCart loads items and enriches them with current product info.
func (s *cartService) buildCart(ctx context.Context, cart *domain.Cart) (dto.CartResponse, error) {
	items, err := s.repo.ListItems(ctx, cart.ID)
	if err != nil {
		return dto.CartResponse{}, apperrors.Internal("failed to list cart items", err)
	}

	ids := make([]uuid.UUID, 0, len(items))
	for _, it := range items {
		ids = append(ids, it.ProductID)
	}
	products := map[uuid.UUID]productdto.ProductResponse{}
	if len(ids) > 0 {
		list, err := s.catalog.GetActiveProducts(ctx, ids)
		if err != nil {
			return dto.CartResponse{}, apperrors.Internal("failed to read products", err)
		}
		for _, p := range list {
			products[p.ID] = p
		}
	}

	resItems := make([]dto.CartItemResponse, 0, len(items))
	total := decimal.Zero
	for _, it := range items {
		ri := dto.CartItemResponse{ProductID: it.ProductID, Quantity: it.Quantity}
		if p, ok := products[it.ProductID]; ok {
			line := p.Price.Mul(decimal.NewFromInt(int64(it.Quantity)))
			ri.Name = p.Name
			ri.Price = p.Price
			ri.LineTotal = line
			ri.Available = true
			total = total.Add(line)
		} else {
			// Product no longer active — show the snapshot, exclude from total.
			ri.Price = it.UnitPriceSnap
			ri.LineTotal = decimal.Zero
			ri.Available = false
		}
		resItems = append(resItems, ri)
	}

	return dto.CartResponse{Items: resItems, Total: total, Count: len(resItems)}, nil
}
