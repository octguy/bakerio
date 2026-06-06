package service

import (
	"testing"

	"github.com/shopspring/decimal"
)

func TestTierFor(t *testing.T) {
	dec := decimal.NewFromInt
	cases := []struct {
		spend int64
		want  string
	}{
		{0, TierBronze},
		{1, TierBronze},
		{999_999, TierBronze},
		{1_000_000, TierSilver},
		{1_000_001, TierSilver},
		{4_999_999, TierSilver},
		{5_000_000, TierGold},
		{99_999_999, TierGold},
	}
	for _, c := range cases {
		if got := TierFor(dec(c.spend)); got != c.want {
			t.Errorf("TierFor(%d) = %q, want %q", c.spend, got, c.want)
		}
	}
}

func TestDiscountPercentFor(t *testing.T) {
	cases := map[string]int{
		TierBronze: 0,
		TierSilver: 5,
		TierGold:   10,
		"":         0,
	}
	for tier, want := range cases {
		if got := DiscountPercentFor(tier); got != want {
			t.Errorf("DiscountPercentFor(%q) = %d, want %d", tier, got, want)
		}
	}
}

func TestComputeTierDiscount(t *testing.T) {
	dec := decimal.NewFromInt
	cases := []struct {
		name     string
		subtotal int64
		tier     string
		want     int64
	}{
		{"BRONZE never discounts", 1_000_000, TierBronze, 0},
		{"SILVER 5% on 100k = 5k", 100_000, TierSilver, 5_000},
		{"GOLD 10% on 100k = 10k", 100_000, TierGold, 10_000},
		{"GOLD 10% on 1_999 floors to 199", 1_999, TierGold, 199},
		{"unknown tier = 0", 1_000_000, "PLATINUM", 0},
	}
	for _, c := range cases {
		got := ComputeTierDiscount(dec(c.subtotal), c.tier)
		if !got.Equal(dec(c.want)) {
			t.Errorf("%s: got %s, want %d", c.name, got, c.want)
		}
	}
}

func TestNextTierThreshold(t *testing.T) {
	if got := NextTierThreshold(TierBronze); got == nil || !got.Equal(decimal.NewFromInt(1_000_000)) {
		t.Errorf("BRONZE next = %v, want 1_000_000", got)
	}
	if got := NextTierThreshold(TierSilver); got == nil || !got.Equal(decimal.NewFromInt(5_000_000)) {
		t.Errorf("SILVER next = %v, want 5_000_000", got)
	}
	if got := NextTierThreshold(TierGold); got != nil {
		t.Errorf("GOLD next = %v, want nil", got)
	}
}
