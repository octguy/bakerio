package procurement

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	procurementdb "github.com/octguy/bakerio/backend/db/sqlc/procurement"
	"github.com/octguy/bakerio/backend/internal/platform/outbox"
	"github.com/octguy/bakerio/backend/internal/procurement/handler"
	"github.com/octguy/bakerio/backend/internal/procurement/repository"
	"github.com/octguy/bakerio/backend/internal/procurement/service"
	"github.com/octguy/bakerio/backend/pkg/txmanager"
)

type Module struct {
	supplierH    *handler.SupplierHandler
	procurementH *handler.ProcurementHandler
}

func NewModule(pool *pgxpool.Pool, txManager txmanager.TransactionManager) *Module {
	queries := procurementdb.New(pool)
	
	supRepo := repository.NewSupplierRepository(queries)
	procRepo := repository.NewProcurementRepository(queries)
	
	// Outbox repository for procurement schema
	outboxRepo := outbox.NewRepository(pool, "procurement.outbox")
	
	supSvc := service.NewSupplierService(supRepo)
	procSvc := service.NewProcurementService(procRepo, supRepo, txManager, outboxRepo)
	
	return &Module{
		supplierH:    handler.NewSupplierHandler(supSvc),
		procurementH: handler.NewProcurementHandler(procSvc),
	}
}

func (m *Module) RegisterRoutes(protected *gin.RouterGroup) {
	m.supplierH.RegisterRoutes(protected)
	m.procurementH.RegisterRoutes(protected)
}
