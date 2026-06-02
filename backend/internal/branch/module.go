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

// Module owns branch management (branches + memberships). The membership
// handler enriches responses via a UserDirectory port supplied at Wire time;
// the branch service receives a ProductSeeder for fan-out on branch creation.
type Module struct {
	branchSvc     service.BranchService
	membershipSvc service.MembershipService
	router        service.BranchRouter
	branchH       *handler.BranchHandler
	membershipH   *handler.MembershipHandler
}

type Deps struct {
	Pool *pgxpool.Pool
	TX   *txmanager.TxManager
}

type LateDeps struct {
	Directory service.UserDirectory
	Seeder    service.ProductSeeder
}

func New(deps Deps) *Module {
	queries := branchdb.New(deps.Pool)
	branchRepo := repository.NewBranchRepository(deps.Pool)
	membershipRepo := repository.NewMembershipRepository(queries)
	routingRepo := repository.NewRoutingRepository(deps.Pool)
	branchSvc := service.NewBranchService(deps.TX, branchRepo)
	membershipSvc := service.NewMembershipService(membershipRepo, branchRepo)
	router := service.NewRoutingService(routingRepo)
	return &Module{
		branchSvc:     branchSvc,
		membershipSvc: membershipSvc,
		router:        router,
		branchH:       handler.NewBranchHandler(branchSvc),
	}
}

func (m *Module) BranchService() service.BranchService         { return m.branchSvc }
func (m *Module) MembershipService() service.MembershipService { return m.membershipSvc }
func (m *Module) Router() service.BranchRouter                 { return m.router }

func (m *Module) Wire(late LateDeps) {
	// Cross-module fan-out hook (product writes its own tables on branch create).
	m.branchSvc.SetProductSeeder(late.Seeder)
	// Membership handler needs the UserDirectory to enrich member responses.
	m.membershipH = handler.NewMembershipHandler(m.membershipSvc, late.Directory)
}

func (m *Module) RegisterRoutes(public, protected *gin.RouterGroup) {
	m.branchH.RegisterRoutes(public, protected)
	m.membershipH.RegisterRoutes(protected)
}
