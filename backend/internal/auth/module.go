package auth

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	authdb "github.com/octguy/bakerio/backend/db/sqlc/auth"
	"github.com/octguy/bakerio/backend/internal/auth/handler"
	"github.com/octguy/bakerio/backend/internal/auth/repository"
	"github.com/octguy/bakerio/backend/internal/auth/service"
	"github.com/octguy/bakerio/backend/internal/platform/outbox"
	profilesvc "github.com/octguy/bakerio/backend/internal/profile/service"
	"github.com/octguy/bakerio/backend/pkg/txmanager"
)

type Module struct {
	handler *handler.AuthHandler
}

func NewModule(
	pool *pgxpool.Pool,
	tx *txmanager.TxManager,
	profSvc profilesvc.ProfileService,
	outboxRepo *outbox.Repository,
	jwtSecret string,
	tokenTTL time.Duration,
) *Module {
	repo := repository.NewAuthRepo(authdb.New(pool))
	svc := service.NewAuthService(repo, tx, profSvc, outboxRepo, jwtSecret, tokenTTL)
	h := handler.NewAuthHandler(svc)
	return &Module{handler: h}
}

func (m *Module) RegisterRoutes(rg *gin.RouterGroup) {
	m.handler.RegisterRoutes(rg)
}
