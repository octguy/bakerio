package user

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	usersdb "github.com/octguy/bakerio/backend/db/sqlc/users"
	authSvc "github.com/octguy/bakerio/backend/internal/auth/service"
	branchSvc "github.com/octguy/bakerio/backend/internal/branch/service"
	"github.com/octguy/bakerio/backend/internal/user/handler"
	"github.com/octguy/bakerio/backend/internal/user/repository"
	"github.com/octguy/bakerio/backend/internal/user/service"
	"github.com/octguy/bakerio/backend/pkg/txmanager"
)

// Module owns user identity-adjacent concerns: profile and admin user
// management. Construction is two-stage because auth depends on the profile
// service: main calls New first, hands ProfileService() to auth, then calls
// Wire once auth + branch are available.
type Module struct {
	profileSvc service.ProfileService
	userDir    branchSvc.UserDirectory
	profileH   *handler.ProfileHandler
	userH      *handler.UserHandler
}

type Deps struct {
	Pool *pgxpool.Pool
	TX   *txmanager.TxManager
}

// LateDeps are the cross-module services injected by main after every module
// has been constructed.
type LateDeps struct {
	Auth       authSvc.AuthService
	RBAC       authSvc.RBACService
	Membership branchSvc.MembershipService
	Branch     branchSvc.BranchService
}

func New(deps Deps) *Module {
	repo := repository.NewProfileRepository(usersdb.New(deps.Pool))
	return &Module{profileSvc: service.NewProfileService(deps.TX, repo)}
}

func (m *Module) ProfileService() service.ProfileService { return m.profileSvc }
func (m *Module) UserDirectory() branchSvc.UserDirectory { return m.userDir }

func (m *Module) Wire(late LateDeps) {
	userSvc := service.NewUserService(m.profileSvc, late.Auth, late.RBAC, late.Membership, late.Branch)
	m.userH = handler.NewUserHandler(userSvc)
	m.profileH = handler.NewProfileHandler(userSvc)
	m.userDir = service.NewUserDirectory(m.profileSvc, late.Auth, late.RBAC)
}

func (m *Module) RegisterRoutes(public, protected *gin.RouterGroup) {
	m.profileH.RegisterRoutes(protected)
	m.userH.RegisterRoutes(protected)
}
