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
	svc := service.NewAuthService(authRepo, rbacSvc, tx, profSvc, outboxRepo, otpSvc, jwtSecret, tokenTTL)
	h := handler.NewAuthHandler(svc)
	return &Module{handler: h, RBACService: rbacSvc}
}

func (m *Module) RegisterRoutes(rg *gin.RouterGroup) {
	m.handler.RegisterRoutes(rg)
}
