package service

import (
	"crypto/rand"
	"fmt"
	"time"
)

// orderCodeAlphabet is base32 minus visually-confusing chars (no 0/O/1/I/L).
// Support reads codes aloud — confusion characters cost time.
const orderCodeAlphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

// generateOrderCode returns "BKO-20260602-A3K7QM". 31^6 ≈ 887M codes per day
// before realistic collisions; the UNIQUE constraint on orders.orders.code
// is the actual backstop. Service retries on constraint conflict (rare).
func generateOrderCode(now time.Time) (string, error) {
	buf := make([]byte, 6)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	suffix := make([]byte, 6)
	for i, b := range buf {
		suffix[i] = orderCodeAlphabet[int(b)%len(orderCodeAlphabet)]
	}
	return fmt.Sprintf("BKO-%s-%s", now.UTC().Format("20060102"), string(suffix)), nil
}
