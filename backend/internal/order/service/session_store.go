package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/octguy/bakerio/backend/internal/platform/cache"
	"github.com/redis/go-redis/v9"
	"github.com/shopspring/decimal"
)

// CheckoutSession is the frozen quote between /orders/select-branch and
// /orders/confirm. Everything the confirm step needs is in here — no
// re-computation, no re-routing. The DB tx does the final atomic decrement
// + insert.
type CheckoutSession struct {
	SessionID         uuid.UUID             `json:"session_id"`
	UserID            uuid.UUID             `json:"user_id"`
	BranchID          uuid.UUID             `json:"branch_id"`
	BranchName        string                `json:"branch_name"`
	Items             []CheckoutSessionItem `json:"items"`
	Subtotal          decimal.Decimal       `json:"subtotal"`
	ShippingFee       decimal.Decimal       `json:"shipping_fee"`
	Total             decimal.Decimal       `json:"total"`
	ShippingAddress   string                `json:"shipping_address"`
	ShippingLatitude  *float64              `json:"shipping_latitude,omitempty"`
	ShippingLongitude *float64              `json:"shipping_longitude,omitempty"`
	ContactPhone      *string               `json:"contact_phone,omitempty"`
	Note              *string               `json:"note,omitempty"`
	DistanceKm        *float64              `json:"distance_km,omitempty"`
	RoutingReason     string                `json:"routing_reason"`
	CreatedAt         time.Time             `json:"created_at"`
	ExpiresAt         time.Time             `json:"expires_at"`
}

type CheckoutSessionItem struct {
	ProductID uuid.UUID       `json:"product_id"`
	Name      string          `json:"name"`
	UnitPrice decimal.Decimal `json:"unit_price"`
	Quantity  int32           `json:"quantity"`
	LineTotal decimal.Decimal `json:"line_total"`
}

// CheckoutSessionStore is the abstraction over Redis. Implementations stash
// JSON under `order:session:<uuid>` with the configured TTL.
type CheckoutSessionStore interface {
	Save(ctx context.Context, s CheckoutSession, ttl time.Duration) error
	// PopByID atomically reads and deletes — confirm is exactly-once.
	// Returns (nil, nil) when the session is missing/expired.
	PopByID(ctx context.Context, id uuid.UUID) (*CheckoutSession, error)
}

type redisCheckoutSessionStore struct {
	cache *cache.Client
}

func NewCheckoutSessionStore(c *cache.Client) CheckoutSessionStore {
	return &redisCheckoutSessionStore{cache: c}
}

func (r *redisCheckoutSessionStore) key(id uuid.UUID) string {
	return "order:session:" + id.String()
}

func (r *redisCheckoutSessionStore) Save(ctx context.Context, s CheckoutSession, ttl time.Duration) error {
	buf, err := json.Marshal(s)
	if err != nil {
		return fmt.Errorf("marshal session: %w", err)
	}
	return r.cache.Set(ctx, r.key(s.SessionID), string(buf), ttl)
}

func (r *redisCheckoutSessionStore) PopByID(ctx context.Context, id uuid.UUID) (*CheckoutSession, error) {
	raw, err := r.cache.GetDel(ctx, r.key(id))
	if err != nil {
		if errors.Is(err, redis.Nil) {
			return nil, nil
		}
		return nil, err
	}
	var s CheckoutSession
	if err := json.Unmarshal([]byte(raw), &s); err != nil {
		return nil, fmt.Errorf("unmarshal session: %w", err)
	}
	return &s, nil
}
