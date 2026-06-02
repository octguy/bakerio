package order

import (
	"github.com/gin-gonic/gin"
	branchSvc "github.com/octguy/bakerio/backend/internal/branch/service"
	"github.com/octguy/bakerio/backend/internal/order/handler"
	"github.com/octguy/bakerio/backend/internal/order/service"
)

// Module owns the order domain. v1 only exposes the preview endpoint
// (POST /orders/find-branches) — schema, real checkout, status transitions,
// and notifications come in subsequent phases per documents/business/order-module.md.
type Module struct {
	previewSvc service.PreviewService
	previewH   *handler.PreviewHandler
}

type Deps struct {
	Router branchSvc.BranchRouter
}

func New(deps Deps) *Module {
	preview := service.NewPreviewService(deps.Router)
	return &Module{
		previewSvc: preview,
		previewH:   handler.NewPreviewHandler(preview),
	}
}

func (m *Module) RegisterRoutes(public, protected *gin.RouterGroup) {
	m.previewH.RegisterRoutes(protected)
}
