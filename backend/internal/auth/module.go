package auth

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	authdb "github.com/octguy/bakerio/backend/db/sqlc/auth"
	"github.com/octguy/bakerio/backend/internal/auth/handler"
	"github.com/octguy/bakerio/backend/internal/auth/repository"
	"github.com/octguy/bakerio/backend/internal/auth/service"
	"github.com/octguy/bakerio/backend/internal/platform/cache"
	"github.com/octguy/bakerio/backend/internal/platform/otp"
	"github.com/octguy/bakerio/backend/internal/platform/outbox"
	"github.com/octguy/bakerio/backend/pkg/txmanager"
)

// Module owns authentication (JWT login, registration, password ops) and the
// RBAC role/permission system.
type Module struct {
	authSvc service.AuthService
	rbacSvc service.RBACService
	authH   *handler.AuthHandler
	rbacH   *handler.RbacHandler
}

// Deps is the construction-time dependency set.
type Deps struct {
	Pool           *pgxpool.Pool
	Redis          *cache.Client
	TX             *txmanager.TxManager
	ProfileCreator service.ProfileCreator
	AuthOutbox     *outbox.Repository
	OTP            *otp.Service
	JWTSecret      string
	JWTExpiry      time.Duration
}

func New(deps Deps) *Module {
	queries := authdb.New(deps.Pool)
	authRepo := repository.NewAuthRepo(queries)
	rbacRepo := repository.NewRBACRepo(queries)
	rbacSvc := service.NewRBACService(rbacRepo, deps.Redis, deps.TX)
	authSvc := service.NewAuthService(
		authRepo, rbacSvc, deps.Redis, deps.TX,
		deps.ProfileCreator, deps.AuthOutbox, deps.OTP,
		deps.JWTSecret, deps.JWTExpiry,
	)
	return &Module{
		authSvc: authSvc,
		rbacSvc: rbacSvc,
		authH:   handler.NewAuthHandler(authSvc),
		rbacH:   handler.NewRbacHandler(rbacSvc),
	}
}

func (m *Module) AuthService() service.AuthService { return m.authSvc }
func (m *Module) RBACService() service.RBACService { return m.rbacSvc }

func (m *Module) RegisterRoutes(public, protected *gin.RouterGroup) {
	m.authH.RegisterRoutes(public, protected)
	m.rbacH.RegisterRoutes(protected)
}
