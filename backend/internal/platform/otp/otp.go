package otp

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"
	"time"

	"github.com/octguy/bakerio/backend/internal/platform/cache"
	goredis "github.com/redis/go-redis/v9"
)

const (
	otpTTL    = 5 * time.Minute // OTP expires after 5 minutes
	otpDigits = 1_000_000       // range: 000000 – 999999
)

type Service struct {
	cache *cache.Client
}

func NewService(cache *cache.Client) *Service {
	return &Service{cache: cache}
}

// Generate creates a cryptographically secure 6-digit OTP and stores it in
// Redis under the key "otp:{userID}" with a 5-minute TTL.
//
// Why crypto/rand and not math/rand?
// math/rand is a pseudo-random number generator seeded from a deterministic
// algorithm — an attacker who knows the seed can predict future values.
// crypto/rand reads from the OS entropy source (/dev/urandom on Linux),
// making it impossible to predict. OTPs must be unpredictable, so always
// use crypto/rand for security-sensitive random values.
func (s *Service) Generate(ctx context.Context, userID string) (string, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(otpDigits))
	if err != nil {
		return "", fmt.Errorf("otp: generate random: %w", err)
	}

	code := fmt.Sprintf("%06d", n.Int64()) // zero-pad to always be 6 digits

	key := otpKey(userID)
	if err := s.cache.Set(ctx, key, code, otpTTL); err != nil {
		return "", fmt.Errorf("otp: store in redis: %w", err)
	}

	return code, nil
}

// Verify checks the submitted code against Redis.
// Returns true only if the code exists and matches.
// On success it deletes the key — OTP is single-use.
//
// Why delete on success and not on failure?
// Deleting on failure would let an attacker trigger one request per code
// and drain attempts. Instead, rely on TTL expiry and rate limiting at
// the HTTP layer to prevent brute force.
func (s *Service) Verify(ctx context.Context, userID, submitted string) (bool, error) {
	key := otpKey(userID)

	stored, err := s.cache.Get(ctx, key)
	if errors.Is(err, goredis.Nil) {
		// Key does not exist: OTP never generated, or it expired
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("otp: redis get: %w", err)
	}

	if stored != submitted {
		return false, nil
	}

	// Match — delete immediately so it cannot be reused
	if err := s.cache.Del(ctx, key); err != nil {
		// Non-fatal: key will expire on its own. Log and continue.
		return true, fmt.Errorf("otp: redis del: %w", err)
	}

	return true, nil
}

// otpKey returns the Redis key for a given user's OTP.
// Namespacing with "otp:" prevents collisions with other keys in the same DB.
func otpKey(userID string) string {
	return "otp:" + userID
}
