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
