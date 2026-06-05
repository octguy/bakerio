package service

import (
	"testing"

	"github.com/shopspring/decimal"

	"github.com/octguy/bakerio/backend/internal/shared/domain"
)

func TestNormalizeCode(t *testing.T) {
	cases := map[string]string{
		"WELCOME10":  "WELCOME10",
		"welcome10":  "WELCOME10",
		"  baker20 ": "BAKER20",
		"":           "",
	}
	for in, want := range cases {
		if got := NormalizeCode(in); got != want {
			t.Errorf("NormalizeCode(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestComputeDiscount(t *testing.T) {
	dec := decimal.NewFromInt
	ptr := func(d decimal.Decimal) *decimal.Decimal { return &d }

	cases := []struct {
		name     string
		subtotal int64
		pct      int16
		maxCap   *decimal.Decimal
		want     int64
	}{
		{"10% on 100k", 100_000, 10, nil, 10_000},
		{"20% on 100k below cap", 100_000, 20, ptr(dec(30_000)), 20_000},
		{"20% on 200k hits cap", 200_000, 20, ptr(dec(30_000)), 30_000},
		{"100% on 1k = 1k", 1_000, 100, nil, 1_000},
		{"floors fractional", 99, 10, nil, 9},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			v := domain.Voucher{DiscountPercent: c.pct, MaxDiscount: c.maxCap}
			got := computeDiscount(dec(c.subtotal), v)
			if !got.Equal(dec(c.want)) {
				t.Errorf("got %s, want %d", got, c.want)
			}
		})
	}
}
