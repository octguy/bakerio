package profile

import (
	"github.com/jackc/pgx/v5/pgxpool"
	profiledb "github.com/octguy/bakerio/backend/db/sqlc/profile"
	"github.com/octguy/bakerio/backend/internal/profile/handler"
	"github.com/octguy/bakerio/backend/internal/profile/repository"
	"github.com/octguy/bakerio/backend/internal/profile/service"
	"github.com/octguy/bakerio/backend/pkg/txmanager"
)

type Module struct {
	handler *handler.ProfileHandler
	svc     service.ProfileService
}

func NewModule(pool *pgxpool.Pool, tx *txmanager.TxManager) *Module {
	repo := repository.NewProfileRepository(profiledb.New(pool))
	svc := service.NewProfileService(tx, repo)
	h := handler.NewProfileHandler(svc)
	return &Module{handler: h, svc: svc}
}

func (m *Module) Service() service.ProfileService {
	return m.svc
}
