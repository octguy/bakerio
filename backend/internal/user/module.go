package user

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	usersdb "github.com/octguy/bakerio/backend/db/sqlc/users"
	authSvc "github.com/octguy/bakerio/backend/internal/auth/service"
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
	profileH   *handler.ProfileHandler
	userH      *handler.UserHandler
}

func New(pool *pgxpool.Pool, tx *txmanager.TxManager) *Module {
	repo := repository.NewProfileRepository(usersdb.New(pool))
	svc := service.NewProfileService(tx, repo)
	return &Module{
		profileSvc: svc,
		profileH:   handler.NewProfileHandler(svc),
	}
}

func (m *Module) ProfileService() service.ProfileService { return m.profileSvc }

// Wire finishes construction once the auth service is available.
func (m *Module) Wire(auth authSvc.AuthService) {
	userSvc := service.NewUserService(m.profileSvc, auth)
	m.userH = handler.NewUserHandler(userSvc)
}

func (m *Module) RegisterRoutes(protected *gin.RouterGroup) {
	m.profileH.RegisterRoutes(protected)
	m.userH.RegisterRoutes(protected)
}
