package order

import (
	"github.com/gin-gonic/gin"

	ordersdb "github.com/octguy/bakerio/backend/db/sqlc/orders"
	branchSvc "github.com/octguy/bakerio/backend/internal/branch/service"
	membershipSvc "github.com/octguy/bakerio/backend/internal/membership/service"
	"github.com/octguy/bakerio/backend/internal/order/handler"
	"github.com/octguy/bakerio/backend/internal/order/repository"
	"github.com/octguy/bakerio/backend/internal/order/service"
	"github.com/octguy/bakerio/backend/internal/platform/cache"
	voucherSvc "github.com/octguy/bakerio/backend/internal/voucher/service"
	"github.com/octguy/bakerio/backend/pkg/txmanager"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Module owns the order domain.
// v1 exposes:
//   - POST /orders/find-branches     (preview, stateless)
//   - POST /orders/select-branch     (freeze quote into Redis session)
//   - POST /orders/confirm           (atomic place from session)
//   - GET  /orders                   (scoped list: own / branch / all)
//   - GET  /orders/:id               (scoped detail)
//
// Schema + repo + checkout flow per documents/business/order-module.md.
type Module struct {
	previewSvc  service.PreviewService
	checkoutSvc service.CheckoutService
	querySvc    service.QueryService
	previewH    *handler.PreviewHandler
	checkoutH   *handler.CheckoutHandler
	queryH      *handler.QueryHandler
}

type Deps struct {
	Pool           *pgxpool.Pool
	TX             *txmanager.TxManager
	Redis          *cache.Client
	Router         branchSvc.BranchRouter
	Catalog        service.Catalog // satisfied by product.ProductService
	Membership     branchSvc.MembershipService
	Voucher        voucherSvc.Service    // optional — nil disables voucher integration
	UserMembership membershipSvc.Service // optional — nil disables tier tracking
}

func New(deps Deps) *Module {
	preview := service.NewPreviewService(deps.Router)

	orderRepo := repository.NewOrderRepository(ordersdb.New(deps.Pool), deps.Pool)
	sessionStore := service.NewCheckoutSessionStore(deps.Redis)
	checkout := service.NewCheckoutService(deps.Router, deps.Catalog, sessionStore, orderRepo, deps.TX, deps.Voucher, deps.UserMembership)
	query := service.NewQueryService(orderRepo, deps.Membership)

	return &Module{
		previewSvc:  preview,
		checkoutSvc: checkout,
		querySvc:    query,
		previewH:    handler.NewPreviewHandler(preview),
		checkoutH:   handler.NewCheckoutHandler(checkout),
		queryH:      handler.NewQueryHandler(query),
	}
}

func (m *Module) RegisterRoutes(public, protected *gin.RouterGroup) {
	m.previewH.RegisterRoutes(protected)
	m.checkoutH.RegisterRoutes(protected)
	m.queryH.RegisterRoutes(protected)
}
