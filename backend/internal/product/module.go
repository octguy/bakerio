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

// Module owns the product catalog: categories, products, images, and per-branch
// availability (branch_products).
//
// Construction is two-stage: New builds the self-contained pieces (category +
// product repos/services); Wire finishes the product handler once the branch
// services (BranchLister + MembershipService) are available.
type Module struct {
	tx          *txmanager.TxManager
	productRepo repository.ProductRepository
	store       service.ObjectStore

	categoryH  *handler.CategoryHandler
	productSvc service.ProductService
	productH   *handler.ProductHandler
}

func New(pool *pgxpool.Pool, tx *txmanager.TxManager, store service.ObjectStore) *Module {
	queries := productdb.New(pool)

	catRepo := repository.NewCategoryRepository(queries)
	catSvc := service.NewCategoryService(tx, catRepo)

	return &Module{
		tx:          tx,
		productRepo: repository.NewProductRepository(queries),
		store:       store,
		categoryH:   handler.NewCategoryHandler(catSvc),
	}
}

// Wire finishes construction once the branch module's services exist.
func (m *Module) Wire(branchLister service.BranchLister, membership branchSvc.MembershipService) {
	m.productSvc = service.NewProductService(m.tx, m.productRepo, branchLister, m.store)
	m.productH = handler.NewProductHandler(m.productSvc, membership)
}

// Service exposes the product service. It satisfies branch.ProductSeeder
// (SeedBranch), used by the branch module's fan-out on branch creation.
func (m *Module) Service() service.ProductService { return m.productSvc }

func (m *Module) RegisterRoutes(protected *gin.RouterGroup) {
	m.categoryH.RegisterRoutes(protected)
	m.productH.RegisterRoutes(protected)
}
