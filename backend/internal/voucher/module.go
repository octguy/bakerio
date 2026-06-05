package voucher

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	voucherdb "github.com/octguy/bakerio/backend/db/sqlc/voucher"
	"github.com/octguy/bakerio/backend/internal/voucher/handler"
	"github.com/octguy/bakerio/backend/internal/voucher/repository"
	"github.com/octguy/bakerio/backend/internal/voucher/service"
)

// Module owns the voucher domain. Exposes the admin CRUD surface, and the
// cross-module Service interface that the order module consumes for
// validate-at-select-branch + redeem-at-confirm.
type Module struct {
	svc service.Service
	h   *handler.Handler
}

type Deps struct {
	Pool *pgxpool.Pool
}

func New(deps Deps) *Module {
	repo := repository.NewVoucherRepository(voucherdb.New(deps.Pool), deps.Pool)
	svc := service.NewService(repo)
	return &Module{svc: svc, h: handler.NewHandler(svc)}
}

// Service is the cross-module accessor — order module reaches voucher logic
// through this rather than poking the repo directly.
func (m *Module) Service() service.Service { return m.svc }

func (m *Module) RegisterRoutes(public, protected *gin.RouterGroup) {
	m.h.RegisterRoutes(protected)
}
