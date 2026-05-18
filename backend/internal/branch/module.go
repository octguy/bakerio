package branch

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	branchdb "github.com/octguy/bakerio/backend/db/sqlc/branch"
	"github.com/octguy/bakerio/backend/internal/branch/handler"
	"github.com/octguy/bakerio/backend/internal/branch/repository"
	"github.com/octguy/bakerio/backend/internal/branch/service"
	"github.com/octguy/bakerio/backend/pkg/txmanager"
)

// Module owns branch management.

type Module struct {
	svc service.BranchService
	h   *handler.BranchHandler
}

func New(pool *pgxpool.Pool, tx *txmanager.TxManager) *Module {
	repo := repository.NewBranchRepository(branchdb.New(pool))
	svc := service.NewBranchService(tx, repo)
	return &Module{
		svc: svc,
		h:   handler.NewBranchHandler(svc),
	}
}

func (m *Module) Service() service.BranchService { return m.svc }

func (m *Module) RegisterRoutes(protected *gin.RouterGroup) {
	m.h.RegisterRoutes(protected)
}
