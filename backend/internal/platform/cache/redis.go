package cache

import (
	"context"
	"fmt"
	"time"

	"github.com/octguy/bakerio/backend/pkg/config"
	"github.com/redis/go-redis/v9"
)

// Client wraps *redis.Client so the rest of the app never imports go-redis directly.
// If you ever swap to another cache (memcached, in-memory for tests), you only
// change this file — callers depend on the Cache interface, not go-redis.
type Client struct {
	rdb *redis.Client
}

func NewClient(cfg config.RedisConfig) (*Client, error) {
	rdb := redis.NewClient(&redis.Options{
		Addr:     cfg.Address,
		Password: cfg.Password,
		DB:       cfg.DB,
	})

	// Ping verifies the connection is alive at startup.
	// Fail fast here rather than discovering the problem at runtime.
	if err := rdb.Ping(context.Background()).Err(); err != nil {
		return nil, fmt.Errorf("redis: ping failed: %w", err)
	}

	return &Client{rdb: rdb}, nil
}

// Set stores key=value with a TTL. After ttl elapses Redis deletes the key
// automatically — no cleanup needed on our side.
func (c *Client) Set(ctx context.Context, key string, value string, ttl time.Duration) error {
	return c.rdb.Set(ctx, key, value, ttl).Err()
}

// Get retrieves a value. Returns ("", redis.Nil) if the key does not exist
// or has expired. Callers should check for redis.Nil specifically.
func (c *Client) Get(ctx context.Context, key string) (string, error) {
	return c.rdb.Get(ctx, key).Result()
}

// Del removes a key immediately. Used after successful OTP verification
// to prevent the same code from being used twice.
func (c *Client) Del(ctx context.Context, key string) error {
	return c.rdb.Del(ctx, key).Err()
}

// Close releases the connection pool. Call this on app shutdown.
func (c *Client) Close() error {
	return c.rdb.Close()
}
