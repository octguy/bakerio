package cart

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	cartdb "github.com/octguy/bakerio/backend/db/sqlc/cart"
	"github.com/octguy/bakerio/backend/internal/cart/handler"
	"github.com/octguy/bakerio/backend/internal/cart/repository"
	"github.com/octguy/bakerio/backend/internal/cart/service"
)

// Module owns the (member-only) shopping cart. It depends on a product Catalog
// to validate items and read current prices.
type Module struct {
	svc service.CartService
	h   *handler.CartHandler
}

func New(pool *pgxpool.Pool, catalog service.Catalog) *Module {
	repo := repository.NewCartRepository(cartdb.New(pool))
	svc := service.NewCartService(repo, catalog)
	return &Module{
		svc: svc,
		h:   handler.NewCartHandler(svc),
	}
}

// Service exposes the cart service for the order module (Stage 3).
func (m *Module) Service() service.CartService { return m.svc }

func (m *Module) RegisterRoutes(protected *gin.RouterGroup) {
	m.h.RegisterRoutes(protected)
}
