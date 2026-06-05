package statistics

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	statisticsdb "github.com/octguy/bakerio/backend/db/sqlc/statistics"
	branchSvc "github.com/octguy/bakerio/backend/internal/branch/service"
	"github.com/octguy/bakerio/backend/internal/statistics/handler"
	"github.com/octguy/bakerio/backend/internal/statistics/service"
)

// Module owns the read-only statistics surface. Exposes:
//   - GET /statistics/overview        (super_admin)
//   - GET /statistics/branches        (super_admin)
//   - GET /statistics/branches/:id    (super_admin OR branch_manager own)
//   - GET /statistics/products        (super_admin OR product_manager)
type Module struct {
	svc service.Service
	h   *handler.Handler
}

type Deps struct {
	Pool       *pgxpool.Pool
	Membership branchSvc.MembershipService
}

func New(deps Deps) *Module {
	svc := service.NewService(statisticsdb.New(deps.Pool))
	return &Module{
		svc: svc,
		h:   handler.NewHandler(svc, deps.Membership),
	}
}

func (m *Module) RegisterRoutes(public, protected *gin.RouterGroup) {
	m.h.RegisterRoutes(protected)
}
