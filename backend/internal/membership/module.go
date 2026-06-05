package membership

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	membershipdb "github.com/octguy/bakerio/backend/db/sqlc/membership"
	"github.com/octguy/bakerio/backend/internal/membership/handler"
	"github.com/octguy/bakerio/backend/internal/membership/repository"
	"github.com/octguy/bakerio/backend/internal/membership/service"
)

// Module owns the customer-membership domain. Exposes:
//   - GET /membership                            (customer)
//   - Service.ApplyOrderSpend (cross-module — order/confirm)
//   - Service.GetForUser      (cross-module if anything else needs it later)
type Module struct {
	svc service.Service
	h   *handler.Handler
}

type Deps struct {
	Pool *pgxpool.Pool
}

func New(deps Deps) *Module {
	repo := repository.NewMembershipRepository(membershipdb.New(deps.Pool), deps.Pool)
	svc := service.NewService(repo)
	return &Module{svc: svc, h: handler.NewHandler(svc)}
}

func (m *Module) Service() service.Service { return m.svc }

func (m *Module) RegisterRoutes(public, protected *gin.RouterGroup) {
	m.h.RegisterRoutes(protected)
}
