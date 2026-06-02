package service

import (
	"context"

	"github.com/google/uuid"
	branchSvc "github.com/octguy/bakerio/backend/internal/branch/service"
	"github.com/octguy/bakerio/backend/internal/order/dto"
)

// PreviewService is the order module's checkout-preview surface. v1 only
// supports "find me the branches that can fulfill this" — it doesn't write
// anything. The real POST /orders comes in a later phase.
type PreviewService interface {
	FindBranches(ctx context.Context, req dto.FindBranchesRequest) (dto.FindBranchesResponse, error)
}

type previewService struct {
	router branchSvc.BranchRouter
}

func NewPreviewService(router branchSvc.BranchRouter) PreviewService {
	return &previewService{router: router}
}

func (s *previewService) FindBranches(ctx context.Context, req dto.FindBranchesRequest) (dto.FindBranchesResponse, error) {
	items := mergeItems(req.Items)

	out, err := s.router.FindBranches(ctx, branchSvc.FindBranchesInput{
		Items:   items,
		ShipLat: req.ShippingLatitude,
		ShipLng: req.ShippingLongitude,
	})
	if err != nil {
		return dto.FindBranchesResponse{}, err
	}

	resp := dto.FindBranchesResponse{
		Subtotal: out.Subtotal,
		Options:  make([]dto.BranchOptionDTO, 0, len(out.Options)),
		Missing:  make([]dto.MissingItemDTO, 0, len(out.Missing)),
	}
	for _, opt := range out.Options {
		resp.Options = append(resp.Options, dto.BranchOptionDTO{
			BranchID:    opt.BranchID,
			Name:        opt.Name,
			Address:     opt.Address,
			Lat:         opt.Lat,
			Lng:         opt.Lng,
			DistanceKm:  opt.DistanceKm,
			ShippingFee: opt.ShippingFee,
			Total:       opt.Total,
			RoutingNote: opt.RoutingNote,
		})
	}
	for _, m := range out.Missing {
		resp.Missing = append(resp.Missing, dto.MissingItemDTO{
			ProductID:    m.ProductID,
			Name:         m.Name,
			Requested:    m.Requested,
			MaxAvailable: m.MaxAvailable,
		})
	}
	return resp, nil
}

// mergeItems sums duplicate product_ids and preserves caller order of first
// appearance. The router's eligibility SQL relies on each product_id appearing
// at most once in the input (HAVING COUNT trick) — without this, the cart
// `[A:2, A:3]` would be treated as "two separate constraints A>=2 AND A>=3"
// instead of the real requirement "A>=5".
func mergeItems(in []dto.FindBranchesItem) []branchSvc.RequestedItem {
	idx := make(map[uuid.UUID]int, len(in)) // product_id → position in out
	out := make([]branchSvc.RequestedItem, 0, len(in))
	for _, it := range in {
		if pos, ok := idx[it.ProductID]; ok {
			out[pos].Quantity += it.Quantity
			continue
		}
		idx[it.ProductID] = len(out)
		out = append(out, branchSvc.RequestedItem{
			ProductID: it.ProductID,
			Quantity:  it.Quantity,
		})
	}
	return out
}
