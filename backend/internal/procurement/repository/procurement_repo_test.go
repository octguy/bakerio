package repository

import (
	"context"
	"testing"

	"github.com/google/uuid"
	branchdb "github.com/octguy/bakerio/backend/db/sqlc/branch"
	procurementdb "github.com/octguy/bakerio/backend/db/sqlc/procurement"
	productdb "github.com/octguy/bakerio/backend/db/sqlc/product"
	"github.com/octguy/bakerio/backend/internal/platform/database"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/suite"
)

type ProcurementRepoTestSuite struct {
	suite.Suite
	repo    ProcurementRepository
	supRepo SupplierRepository
	testDB  *database.TestDB

	// Helpers for setup
	branchQueries  *branchdb.Queries
	productQueries *productdb.Queries
}

func (s *ProcurementRepoTestSuite) SetupSuite() {
	ctx := context.Background()
	tdb, err := database.SetupTestDatabase(ctx)
	if err != nil {
		s.FailNow("Failed to setup test database", err)
	}

	s.testDB = tdb
	queries := procurementdb.New(tdb.Pool)
	s.repo = NewProcurementRepository(queries)
	s.supRepo = NewSupplierRepository(queries)
	s.branchQueries = branchdb.New(tdb.Pool)
	s.productQueries = productdb.New(tdb.Pool)
}

func (s *ProcurementRepoTestSuite) TearDownTest() {
	ctx := context.Background()
	_, _ = s.testDB.Pool.Exec(ctx, "DELETE FROM procurement.po_items")
	_, _ = s.testDB.Pool.Exec(ctx, "DELETE FROM procurement.purchase_orders")
	_, _ = s.testDB.Pool.Exec(ctx, "DELETE FROM procurement.suppliers")
	_, _ = s.testDB.Pool.Exec(ctx, "DELETE FROM product.products")
	_, _ = s.testDB.Pool.Exec(ctx, "DELETE FROM branch.branches")
}

func (s *ProcurementRepoTestSuite) TearDownSuite() {
	if s.testDB != nil {
		s.testDB.Teardown(context.Background())
	}
}

func (s *ProcurementRepoTestSuite) TestRegionalSuppliers() {
	ctx := context.Background()

	// 1. Setup suppliers in different regions
	_, err := s.supRepo.Create(ctx, &domain.Supplier{Name: "North Sup", Region: "north"})
	s.Require().NoError(err)
	_, err = s.supRepo.Create(ctx, &domain.Supplier{Name: "South Sup", Region: "south"})
	s.Require().NoError(err)

	// 2. Test filtering
	northSups, err := s.supRepo.ListByRegion(ctx, "north")
	s.Require().NoError(err)
	s.Len(northSups, 1)
	s.Equal("North Sup", northSups[0].Name)

	southSups, err := s.supRepo.ListByRegion(ctx, "south")
	s.Require().NoError(err)
	s.Len(southSups, 1)
	s.Equal("South Sup", southSups[0].Name)
}

func (s *ProcurementRepoTestSuite) TestPurchaseOrderPersistence() {
	ctx := context.Background()

	// 1. Setup prerequisites (Branch, Supplier, Product)
	branch, err := s.branchQueries.CreateBranch(ctx, branchdb.CreateBranchParams{
		Name:    "Test Branch",
		Address: "Addr",
		Region:  "south",
	})
	s.Require().NoError(err)

	sup, err := s.supRepo.Create(ctx, &domain.Supplier{Name: "Test Sup", Region: "south"})
	s.Require().NoError(err)

	product, err := s.productQueries.CreateProduct(ctx, productdb.CreateProductParams{
		Sku:       "FLOUR-1",
		Name:      "Flour",
		Slug:      "flour",
		Unit:      "kg",
		BasePrice: decimal.NewFromInt(10),
	})
	s.Require().NoError(err)

	// 2. Create PO
	po := &domain.PurchaseOrder{
		SupplierID:  sup.ID,
		BranchID:    branch.ID,
		Status:      domain.POStatusDraft,
		TotalAmount: decimal.NewFromInt(100),
	}

	createdPO, err := s.repo.CreatePO(ctx, po)
	s.NoError(err)
	s.NotEqual(uuid.Nil, createdPO.ID)

	// 3. Create PO Item
	item := &domain.POItem{
		POID:      createdPO.ID,
		ProductID: product.ID,
		Quantity:  decimal.NewFromInt(10),
		UnitPrice: decimal.NewFromInt(10),
		// TotalPrice is computed by DB
	}
	_, err = s.repo.CreatePOItem(ctx, item)
	s.NoError(err)

	// 4. Fetch and Verify
	fetchedItems, err := s.repo.GetPOItems(ctx, createdPO.ID)
	s.Require().NoError(err)
	s.Len(fetchedItems, 1)
	s.Equal(product.ID, fetchedItems[0].ProductID)
	// Verify GENERATED column
	s.Equal(decimal.NewFromInt(100).String(), fetchedItems[0].TotalPrice.String())
}

func (s *ProcurementRepoTestSuite) TestListPOsByBranch() {
	ctx := context.Background()

	branch1, _ := s.branchQueries.CreateBranch(ctx, branchdb.CreateBranchParams{Name: "B1", Address: "A1", Region: "south"})
	branch2, _ := s.branchQueries.CreateBranch(ctx, branchdb.CreateBranchParams{Name: "B2", Address: "A2", Region: "north"})
	sup, _ := s.supRepo.Create(ctx, &domain.Supplier{Name: "Sup", Region: "south"})

	po1 := &domain.PurchaseOrder{SupplierID: sup.ID, BranchID: branch1.ID, Status: domain.POStatusDraft, TotalAmount: decimal.NewFromInt(100)}
	po2 := &domain.PurchaseOrder{SupplierID: sup.ID, BranchID: branch2.ID, Status: domain.POStatusDraft, TotalAmount: decimal.NewFromInt(200)}

	_, _ = s.repo.CreatePO(ctx, po1)
	_, _ = s.repo.CreatePO(ctx, po2)

	list1, err := s.repo.ListPOsByBranch(ctx, branch1.ID)
	s.NoError(err)
	s.Len(list1, 1)
	s.Equal(branch1.ID, list1[0].BranchID)

	list2, err := s.repo.ListPOsByBranch(ctx, branch2.ID)
	s.NoError(err)
	s.Len(list2, 1)
	s.Equal(branch2.ID, list2[0].BranchID)
}

func (s *ProcurementRepoTestSuite) TestUpdatePOStatus() {
	ctx := context.Background()

	branch, _ := s.branchQueries.CreateBranch(ctx, branchdb.CreateBranchParams{Name: "B1", Address: "A1", Region: "south"})
	sup, _ := s.supRepo.Create(ctx, &domain.Supplier{Name: "Sup", Region: "south"})
	po := &domain.PurchaseOrder{SupplierID: sup.ID, BranchID: branch.ID, Status: domain.POStatusDraft, TotalAmount: decimal.NewFromInt(100)}
	created, _ := s.repo.CreatePO(ctx, po)

	updated, err := s.repo.UpdatePOStatus(ctx, created.ID, domain.POStatusApproved, created.Version)
	s.NoError(err)
	s.Equal(domain.POStatusApproved, updated.Status)

	fetched, _ := s.repo.GetPO(ctx, created.ID)
	s.Equal(domain.POStatusApproved, fetched.Status)
}

func TestProcurementRepoSuite(t *testing.T) {
	suite.Run(t, new(ProcurementRepoTestSuite))
}
