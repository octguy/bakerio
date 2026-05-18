package repository

import (
	"context"
	"testing"

	"github.com/google/uuid"
	productdb "github.com/octguy/bakerio/backend/db/sqlc/product"
	"github.com/octguy/bakerio/backend/internal/platform/database"
	"github.com/stretchr/testify/suite"
)

type ImageRepoTestSuite struct {
	suite.Suite
	repo   ImageRepository
	testDB *database.TestDB
}

func (s *ImageRepoTestSuite) SetupSuite() {
	ctx := context.Background()
	tdb, err := database.SetupTestDatabase(ctx)
	if err != nil {
		s.FailNow("Failed to setup test database", err)
	}

	s.testDB = tdb
	s.repo = NewImageRepository(productdb.New(tdb.Pool))
}

func (s *ImageRepoTestSuite) TearDownTest() {
	ctx := context.Background()
	_, _ = s.testDB.Pool.Exec(ctx, "DELETE FROM product.product_images")
	_, _ = s.testDB.Pool.Exec(ctx, "DELETE FROM product.products")
}

func (s *ImageRepoTestSuite) TearDownSuite() {
	if s.testDB != nil {
		s.testDB.Teardown(context.Background())
	}
}

func (s *ImageRepoTestSuite) TestAddImage() {
	ctx := context.Background()
	
	// Create product
	prodID := uuid.New()
	_, err := s.testDB.Pool.Exec(ctx, "INSERT INTO product.products (id, sku, name, slug) VALUES ($1, $2, $3, $4)", prodID, "S1", "N1", "s-1")
	s.NoError(err)

	img, err := s.repo.AddImage(ctx, prodID, "http://url.com", true, 0)
	s.NoError(err)
	s.Equal(prodID, img.ProductID)
	s.Equal("http://url.com", img.Url)
	s.True(img.IsPrimary)
}

func (s *ImageRepoTestSuite) TestSetPrimary() {
	ctx := context.Background()
	
	prodID := uuid.New()
	_, _ = s.testDB.Pool.Exec(ctx, "INSERT INTO product.products (id, sku, name, slug) VALUES ($1, $2, $3, $4)", prodID, "S1", "N1", "s-1")

	img1, _ := s.repo.AddImage(ctx, prodID, "url1", true, 0)
	img2, _ := s.repo.AddImage(ctx, prodID, "url2", false, 1)

	err := s.repo.SetPrimary(ctx, prodID, img2.ID)
	s.NoError(err)

	// Verify img2 is primary and img1 is not
	i1, _ := s.repo.GetByID(ctx, img1.ID)
	i2, _ := s.repo.GetByID(ctx, img2.ID)
	s.False(i1.IsPrimary)
	s.True(i2.IsPrimary)
}

func TestImageRepoSuite(t *testing.T) {
	suite.Run(t, new(ImageRepoTestSuite))
}
