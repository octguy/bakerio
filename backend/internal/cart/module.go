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
// (read-only, one-way downward dep) to validate items and read current prices.
type Module struct {
	cartSvc service.CartService
	cartH   *handler.CartHandler
}

type Deps struct {
	Pool    *pgxpool.Pool
	Catalog service.Catalog
}

func New(deps Deps) *Module {
	repo := repository.NewCartRepository(cartdb.New(deps.Pool))
	svc := service.NewCartService(repo, deps.Catalog)
	return &Module{cartSvc: svc, cartH: handler.NewCartHandler(svc)}
}

// CartService exposes the cart for the order module (Stage 3) to consume.
func (m *Module) CartService() service.CartService { return m.cartSvc }

func (m *Module) RegisterRoutes(public, protected *gin.RouterGroup) {
	m.cartH.RegisterRoutes(protected)
}
