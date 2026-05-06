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
	profilesvc "github.com/octguy/bakerio/backend/internal/profile/service"
	"github.com/octguy/bakerio/backend/pkg/txmanager"
)

type Module struct {
	handler     *handler.AuthHandler
	authSvc     service.AuthService
	RBACService service.RBACService
}

func NewModule(
	pool *pgxpool.Pool,
	redis *cache.Client,
	tx *txmanager.TxManager,
	profSvc profilesvc.ProfileService,
	outboxRepo *outbox.Repository,
	otpSvc *otp.Service,
	jwtSecret string,
	tokenTTL time.Duration,
) *Module {
	queries := authdb.New(pool)
	authRepo := repository.NewAuthRepo(queries)
	rbacRepo := repository.NewRBACRepo(queries)
	rbacSvc := service.NewRBACService(rbacRepo, redis)
	svc := service.NewAuthService(authRepo, rbacSvc, redis, tx, profSvc, outboxRepo, otpSvc, jwtSecret, tokenTTL)
	h := handler.NewAuthHandler(svc)
	return &Module{handler: h, authSvc: svc, RBACService: rbacSvc}
}

func (m *Module) Service() service.AuthService { return m.authSvc }

func (m *Module) RegisterRoutes(public, protected *gin.RouterGroup) {
	m.handler.RegisterRoutes(public, protected)
}
