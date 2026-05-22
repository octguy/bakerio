package product

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	productdb "github.com/octguy/bakerio/backend/db/sqlc/product"
	"github.com/octguy/bakerio/backend/internal/product/handler"
	"github.com/octguy/bakerio/backend/internal/product/repository"
	"github.com/octguy/bakerio/backend/internal/product/service"
	"github.com/octguy/bakerio/backend/pkg/txmanager"
)

type Module struct {
	categorySvc service.CategoryService
	categoryH   *handler.CategoryHandler
}

func New(pool *pgxpool.Pool, tx *txmanager.TxManager) *Module {
	queries := productdb.New(pool)

	// Category
	catRepo := repository.NewCategoryRepository(queries)
	catSvc := service.NewCategoryService(tx, catRepo)
	catH := handler.NewCategoryHandler(catSvc)

	return &Module{
		categorySvc: catSvc,
		categoryH:   catH,
	}
}

func (m *Module) RegisterRoutes(public, protected *gin.RouterGroup) {
	m.categoryH.RegisterRoutes(public, protected)
}
