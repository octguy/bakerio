package service

import (
	"context"
	"math"
	"sort"

	"github.com/google/uuid"
	"github.com/octguy/bakerio/backend/internal/branch/repository"
	"github.com/shopspring/decimal"
)

// shippingFeeTier matches order-module.md D12 (the tiered shipping policy):
//
//	0 < d ≤  3 km → 15,000 VND
//	3 < d ≤  7 km → 25,000 VND
//	7 < d ≤ 15 km → 40,000 VND
//	     d > 15 km → ineligible (filtered out before ranking)
//
// Tier table lives in code for v1; move to DB-config when marketing needs A/B.
const (
	maxDeliveryKm = 15.0
	feeTier1Cap   = 3.0
	feeTier2Cap   = 7.0

	feeTier1 = 15000
	feeTier2 = 25000
	feeTier3 = 40000
	feeNoGeo = 25000 // flat fallback when caller didn't send coords
)

type routingService struct {
	repo repository.RoutingRepository
}

func NewRoutingService(repo repository.RoutingRepository) BranchRouter {
	return &routingService{repo: repo}
}

func (s *routingService) FindBranches(ctx context.Context, in FindBranchesInput) (FindBranchesOutput, error) {
	productIDs, quantities := splitItems(in.Items)

	subtotal, rows, err := s.repo.EligibleBranches(ctx, productIDs, quantities)
	if err != nil {
		return FindBranchesOutput{}, err
	}

	// No eligible branches → explain which items are blocking. Callers turn
	// this into a 422 payload so the UI can highlight the offending cart rows.
	if len(rows) == 0 {
		missingRows, err := s.repo.MissingItems(ctx, productIDs, quantities)
		if err != nil {
			return FindBranchesOutput{}, err
		}
		return FindBranchesOutput{
			Subtotal: subtotal,
			Missing:  mapMissing(missingRows),
		}, nil
	}

	options := make([]BranchOption, 0, len(rows))
	for _, b := range rows {
		opt := BranchOption{
			BranchID: b.BranchID,
			Name:     b.Name,
			Address:  b.Address,
			Lat:      b.Lat,
			Lng:      b.Lng,
		}
		if in.ShipLat != nil && in.ShipLng != nil {
			dist := haversineKm(*in.ShipLat, *in.ShipLng, b.Lat, b.Lng)
			// Hard cap — out of delivery range. Skip this branch entirely.
			if dist > maxDeliveryKm {
				continue
			}
			opt.DistanceKm = &dist
			opt.ShippingFee = decimal.NewFromInt(int64(tierFee(dist)))
			opt.RoutingNote = "nearest_eligible"
		} else {
			// No shipping coords → flat fallback fee, no per-branch ranking
			// by distance. Audit reason on the resulting order will say so.
			opt.ShippingFee = decimal.NewFromInt(int64(feeNoGeo))
			opt.RoutingNote = "no_geocode_fallback"
		}
		opt.Total = subtotal.Add(opt.ShippingFee)
		options = append(options, opt)
	}

	// Same cap as above for the "no eligible after distance filter" case.
	if len(options) == 0 {
		// We could surface a "all branches are out of range" error here,
		// but for now just return zero options — the handler turns that
		// into the same 422 as no_branch_available with an empty Missing
		// (which the client will read as "out of delivery zone"). This is
		// rare enough that a richer error code can wait.
		return FindBranchesOutput{Subtotal: subtotal}, nil
	}

	// Sort by shipping_fee asc, then exact distance asc (tiebreak within a
	// tier). Without coords, distance is nil for everyone — sort is stable
	// so DB order wins (effectively undefined but consistent within a run).
	sort.SliceStable(options, func(i, j int) bool {
		ci := options[i].ShippingFee.Cmp(options[j].ShippingFee)
		if ci != 0 {
			return ci < 0
		}
		if options[i].DistanceKm != nil && options[j].DistanceKm != nil {
			return *options[i].DistanceKm < *options[j].DistanceKm
		}
		return false
	})

	return FindBranchesOutput{
		Subtotal: subtotal,
		Options:  options,
	}, nil
}

// haversineKm — great-circle distance between two lat/lng pairs, in km.
// Earth radius = 6371 km, plenty accurate for delivery-radius decisions.
func haversineKm(lat1, lng1, lat2, lng2 float64) float64 {
	const r = 6371.0
	toRad := func(x float64) float64 { return x * math.Pi / 180 }
	dLat := toRad(lat2 - lat1)
	dLng := toRad(lng2 - lng1)
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(toRad(lat1))*math.Cos(toRad(lat2))*
			math.Sin(dLng/2)*math.Sin(dLng/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return r * c
}

func tierFee(distanceKm float64) int {
	switch {
	case distanceKm <= feeTier1Cap:
		return feeTier1
	case distanceKm <= feeTier2Cap:
		return feeTier2
	default:
		return feeTier3
	}
}

func splitItems(items []RequestedItem) ([]uuid.UUID, []int32) {
	pids := make([]uuid.UUID, len(items))
	qtys := make([]int32, len(items))
	for i, it := range items {
		pids[i] = it.ProductID
		qtys[i] = it.Quantity
	}
	return pids, qtys
}

func mapMissing(rows []repository.MissingItemRow) []MissingItem {
	out := make([]MissingItem, len(rows))
	for i, r := range rows {
		out[i] = MissingItem{
			ProductID:    r.ProductID,
			Name:         r.Name,
			Requested:    r.Requested,
			MaxAvailable: r.MaxAvailable,
		}
	}
	return out
}
