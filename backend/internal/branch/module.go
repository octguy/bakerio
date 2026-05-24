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
	svc           service.BranchService
	membershipSvc service.MembershipService
	h             *handler.BranchHandler
	mh            *handler.MembershipHandler
}

func New(pool *pgxpool.Pool, tx *txmanager.TxManager) *Module {
	queries := branchdb.New(pool)
	branchRepo := repository.NewBranchRepository(queries)
	membershipRepo := repository.NewMembershipRepository(queries)
	svc := service.NewBranchService(tx, branchRepo)
	membershipSvc := service.NewMembershipService(membershipRepo, branchRepo)
	return &Module{
		svc:           svc,
		membershipSvc: membershipSvc,
		h:             handler.NewBranchHandler(svc),
	}
}

func (m *Module) BranchService() service.BranchService         { return m.svc }
func (m *Module) MembershipService() service.MembershipService { return m.membershipSvc }

// WireDirectory finishes construction once a UserDirectory (adapter over the
// user + auth modules) is available. The membership handler enriches its
// responses with member details, so it can only be built here.
func (m *Module) WireDirectory(dir service.UserDirectory) {
	m.mh = handler.NewMembershipHandler(m.membershipSvc, dir)
}

func (m *Module) RegisterRoutes(protected *gin.RouterGroup) {
	m.h.RegisterRoutes(protected)
	m.mh.RegisterRoutes(protected)
}
