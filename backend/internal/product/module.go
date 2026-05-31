package product

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	productdb "github.com/octguy/bakerio/backend/db/sqlc/product"
	branchSvc "github.com/octguy/bakerio/backend/internal/branch/service"
	"github.com/octguy/bakerio/backend/internal/product/handler"
	"github.com/octguy/bakerio/backend/internal/product/repository"
	"github.com/octguy/bakerio/backend/internal/product/service"
	"github.com/octguy/bakerio/backend/pkg/txmanager"
)

// Module owns the product catalog (categories, products, images) and per-branch
// availability (branch_products). Two-stage: New builds the catalog side;
// Wire finishes the product side once the branch module is available.
type Module struct {
	tx          *txmanager.TxManager
	productRepo repository.ProductRepository
	store       service.ObjectStore

	categoryH  *handler.CategoryHandler
	productSvc service.ProductService
	productH   *handler.ProductHandler
}

type Deps struct {
	Pool  *pgxpool.Pool
	TX    *txmanager.TxManager
	Store service.ObjectStore
}

type LateDeps struct {
	BranchLister service.BranchLister
	Membership   branchSvc.MembershipService
}

func New(deps Deps) *Module {
	queries := productdb.New(deps.Pool)
	catRepo := repository.NewCategoryRepository(queries)
	catSvc := service.NewCategoryService(deps.TX, catRepo)
	return &Module{
		tx:          deps.TX,
		productRepo: repository.NewProductRepository(queries),
		store:       deps.Store,
		categoryH:   handler.NewCategoryHandler(catSvc),
	}
}

func (m *Module) Wire(late LateDeps) {
	m.productSvc = service.NewProductService(m.tx, m.productRepo, late.BranchLister, m.store)
	m.productH = handler.NewProductHandler(m.productSvc, late.Membership)
}

// ProductService satisfies branch.ProductSeeder (SeedBranch), used by the
// branch module's fan-out on branch creation.
func (m *Module) ProductService() service.ProductService { return m.productSvc }

func (m *Module) RegisterRoutes(public, protected *gin.RouterGroup) {
	m.categoryH.RegisterRoutes(public, protected)
	m.productH.RegisterRoutes(public, protected)
}
