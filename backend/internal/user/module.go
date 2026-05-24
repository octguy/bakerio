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

// Module owns user identity-adjacent concerns: profile and admin user mgmt.
//
// Construction is two-stage because auth depends on the profile service
// (to seed a profile when an account is created), while user_service depends
// on auth. main.go calls New first, passes ProfileService() into auth, then
// calls Wire(authSvc) to finish.
type Module struct {
	profileSvc service.ProfileService
	userDir    branchSvc.UserDirectory
	profileH   *handler.ProfileHandler
	userH      *handler.UserHandler
}

func New(pool *pgxpool.Pool, tx *txmanager.TxManager) *Module {
	repo := repository.NewProfileRepository(usersdb.New(pool))
	svc := service.NewProfileService(tx, repo)
	return &Module{
		profileSvc: svc,
	}
}

func (m *Module) ProfileService() service.ProfileService { return m.profileSvc }

// Wire finishes construction once the auth and branch services are available.
// The own-profile handler is built here too, since enrichment (role + branch)
// needs the auth and branch services.
func (m *Module) Wire(
	auth authSvc.AuthService,
	rbac authSvc.RBACService,
	membership branchSvc.MembershipService,
	branch branchSvc.BranchService,
) {
	userSvc := service.NewUserService(m.profileSvc, auth, rbac, membership, branch)
	m.userH = handler.NewUserHandler(userSvc)
	m.profileH = handler.NewProfileHandler(userSvc)
	m.userDir = service.NewUserDirectory(m.profileSvc, auth, rbac)
}

// UserDirectory exposes the adapter the branch module consumes to enrich its
// member responses. Available after Wire.
func (m *Module) UserDirectory() branchSvc.UserDirectory { return m.userDir }

func (m *Module) RegisterRoutes(protected *gin.RouterGroup) {
	m.profileH.RegisterRoutes(protected)
	m.userH.RegisterRoutes(protected)
}
