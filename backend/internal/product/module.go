package product

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	productdb "github.com/octguy/bakerio/backend/db/sqlc/product"
	"github.com/octguy/bakerio/backend/internal/platform/mediastore"
	"github.com/octguy/bakerio/backend/internal/product/handler"
	"github.com/octguy/bakerio/backend/internal/product/repository"
	"github.com/octguy/bakerio/backend/internal/product/service"
	"github.com/octguy/bakerio/backend/pkg/txmanager"
)

type Module struct {
	categorySvc service.CategoryService
	categoryH   *handler.CategoryHandler
	imageSvc    service.ImageService
	imageH      *handler.ImageHandler
	productSvc  service.ProductService
	productH    *handler.ProductHandler
}

func New(pool *pgxpool.Pool, tx *txmanager.TxManager, ms mediastore.MediaStore, maxSize int64) *Module {
	queries := productdb.New(pool)

	// Category
	catRepo := repository.NewCategoryRepository(queries)
	catSvc := service.NewCategoryService(tx, catRepo)
	catH := handler.NewCategoryHandler(catSvc)

	// Image
	imgRepo := repository.NewImageRepository(queries)
	imgSvc := service.NewImageService(tx, imgRepo, ms)
	imgH := handler.NewImageHandler(imgSvc, maxSize)

	// Product
	prodRepo := repository.NewProductRepository(queries)
	prodSvc := service.NewProductService(tx, prodRepo, imgRepo)
	prodH := handler.NewProductHandler(prodSvc)

	return &Module{
		categorySvc: catSvc,
		categoryH:   catH,
		imageSvc:    imgSvc,
		imageH:      imgH,
		productSvc:  prodSvc,
		productH:    prodH,
	}
}

func (m *Module) RegisterRoutes(protected *gin.RouterGroup) {
	m.categoryH.RegisterRoutes(protected)
	m.imageH.RegisterRoutes(protected)
	m.productH.RegisterRoutes(protected)
}
