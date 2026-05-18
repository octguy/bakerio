package repository

import (
	"context"
	"testing"

	"github.com/google/uuid"
	productdb "github.com/octguy/bakerio/backend/db/sqlc/product"
	"github.com/octguy/bakerio/backend/internal/platform/database"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/suite"
)

type ProductRepoTestSuite struct {
	suite.Suite
	repo   ProductRepository
	testDB *database.TestDB
}

func (s *ProductRepoTestSuite) SetupSuite() {
	ctx := context.Background()
	tdb, err := database.SetupTestDatabase(ctx)
	if err != nil {
		s.FailNow("Failed to setup test database", err)
	}

	s.testDB = tdb
	s.repo = NewProductRepository(productdb.New(tdb.Pool))
}

func (s *ProductRepoTestSuite) TearDownTest() {
	ctx := context.Background()
	_, _ = s.testDB.Pool.Exec(ctx, "DELETE FROM product.product_price_history")
	_, _ = s.testDB.Pool.Exec(ctx, "DELETE FROM product.product_prices")
	_, _ = s.testDB.Pool.Exec(ctx, "DELETE FROM product.products")
	_, _ = s.testDB.Pool.Exec(ctx, "DELETE FROM branch.branches")
}

func (s *ProductRepoTestSuite) TearDownSuite() {
	if s.testDB != nil {
		s.testDB.Teardown(context.Background())
	}
}

func (s *ProductRepoTestSuite) TestCreate() {
	ctx := context.Background()
	price := decimal.NewFromFloat(10.5)
	p := &domain.Product{
		SKU:       "SKU-1",
		Name:      "Product 1",
		Slug:      "product-1",
		Unit:      "piece",
		BasePrice: price,
	}

	created, err := s.repo.Create(ctx, p)
	s.NoError(err)
	s.NotEqual(uuid.Nil, created.ID)
	s.Equal(p.SKU, created.SKU)
	s.True(created.BasePrice.Equal(price))
}

func (s *ProductRepoTestSuite) TestSetPrice() {
	ctx := context.Background()
	
	// Create branch first
	branchID := uuid.New()
	_, err := s.testDB.Pool.Exec(ctx, "INSERT INTO branch.branches (id, name, address) VALUES ($1, $2, $3)", branchID, "Branch 1", "Addr 1")
	s.NoError(err)

	// Create product
	p := &domain.Product{SKU: "S1", Name: "N1", Slug: "s-1", Unit: "p", BasePrice: decimal.NewFromInt(10)}
	created, err := s.repo.Create(ctx, p)
	s.NoError(err)

	price := decimal.NewFromFloat(12.5)
	pp, err := s.repo.SetPrice(ctx, created.ID, branchID, price)
	s.NoError(err)
	s.Equal(branchID, pp.BranchID)
	s.True(pp.Price.Equal(price))
}

func (s *ProductRepoTestSuite) TestPriceHistory() {
	ctx := context.Background()
	
	p := &domain.Product{SKU: "S1", Name: "N1", Slug: "s-1", Unit: "p", BasePrice: decimal.NewFromInt(10)}
	created, err := s.repo.Create(ctx, p)
	s.NoError(err)

	price := decimal.NewFromFloat(10.5)
	err = s.repo.InsertPriceHistory(ctx, created.ID, nil, price)
	s.NoError(err)

	history, err := s.repo.ListPriceHistory(ctx, created.ID)
	s.NoError(err)
	s.Len(history, 1)
	s.True(history[0].Price.Equal(price))
	s.Nil(history[0].BranchID)
}

func (s *ProductRepoTestSuite) TestGetByIDAndSlug() {
	ctx := context.Background()
	p := &domain.Product{SKU: "S2", Name: "N2", Slug: "s-2", Unit: "p", BasePrice: decimal.NewFromInt(10)}
	created, err := s.repo.Create(ctx, p)
	s.NoError(err)

	byID, err := s.repo.GetByID(ctx, created.ID)
	s.NoError(err)
	s.Equal(created.ID, byID.ID)

	bySlug, err := s.repo.GetBySlug(ctx, "s-2")
	s.NoError(err)
	s.Equal(created.ID, bySlug.ID)

	_, err = s.repo.GetByID(ctx, uuid.New())
	s.Error(err)
}

func (s *ProductRepoTestSuite) TestList() {
	ctx := context.Background()
	p1 := &domain.Product{SKU: "S3", Name: "N3", Slug: "s-3", Unit: "p", BasePrice: decimal.NewFromInt(10)}
	p2 := &domain.Product{SKU: "S4", Name: "N4", Slug: "s-4", Unit: "p", BasePrice: decimal.NewFromInt(20)}
	_, _ = s.repo.Create(ctx, p1)
	_, _ = s.repo.Create(ctx, p2)

	list, err := s.repo.List(ctx)
	s.NoError(err)
	s.GreaterOrEqual(len(list), 2)
}

func (s *ProductRepoTestSuite) TestUpdate() {
	ctx := context.Background()
	p := &domain.Product{SKU: "S5", Name: "N5", Slug: "s-5", Unit: "p", BasePrice: decimal.NewFromInt(10), IsActive: true}
	created, err := s.repo.Create(ctx, p)
	s.NoError(err)

	created.Name = "N5 Updated"
	created.BasePrice = decimal.NewFromInt(15)
	created.IsActive = false
	updated, err := s.repo.Update(ctx, created)
	s.NoError(err)
	s.Equal("N5 Updated", updated.Name)
	s.False(updated.IsActive)
	s.True(updated.BasePrice.Equal(decimal.NewFromInt(15)))
}

func (s *ProductRepoTestSuite) TestDelete() {
	ctx := context.Background()
	p := &domain.Product{SKU: "S6", Name: "N6", Slug: "s-6", Unit: "p", BasePrice: decimal.NewFromInt(10)}
	created, err := s.repo.Create(ctx, p)
	s.NoError(err)

	err = s.repo.Delete(ctx, created.ID)
	s.NoError(err)

	_, err = s.repo.GetByID(ctx, created.ID)
	s.Error(err)
}

func (s *ProductRepoTestSuite) TestGetPrice() {
	ctx := context.Background()
	branchID := uuid.New()
	_, _ = s.testDB.Pool.Exec(ctx, "INSERT INTO branch.branches (id, name, address) VALUES ($1, $2, $3)", branchID, "B", "A")

	p := &domain.Product{SKU: "S7", Name: "N7", Slug: "s-7", Unit: "p", BasePrice: decimal.NewFromInt(10)}
	created, _ := s.repo.Create(ctx, p)

	price := decimal.NewFromInt(20)
	_, _ = s.repo.SetPrice(ctx, created.ID, branchID, price)

	pp, err := s.repo.GetPrice(ctx, created.ID, branchID)
	s.NoError(err)
	s.True(pp.Price.Equal(price))

	_, err = s.repo.GetPrice(ctx, created.ID, uuid.New())
	s.Error(err)
}

func TestProductRepoSuite(t *testing.T) {
	suite.Run(t, new(ProductRepoTestSuite))
}
