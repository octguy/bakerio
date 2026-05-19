package repository

import (
	"context"
	"testing"

	"github.com/google/uuid"
	procurementdb "github.com/octguy/bakerio/backend/db/sqlc/procurement"
	"github.com/octguy/bakerio/backend/internal/platform/database"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
	"github.com/stretchr/testify/suite"
)

type SupplierRepoTestSuite struct {
	suite.Suite
	repo   SupplierRepository
	testDB *database.TestDB
}

func (s *SupplierRepoTestSuite) SetupSuite() {
	ctx := context.Background()
	tdb, err := database.SetupTestDatabase(ctx)
	if err != nil {
		s.FailNow("Failed to setup test database", err)
	}

	s.testDB = tdb
	s.repo = NewSupplierRepository(procurementdb.New(tdb.Pool))
}

func (s *SupplierRepoTestSuite) TearDownTest() {
	_, err := s.testDB.Pool.Exec(context.Background(), "DELETE FROM procurement.suppliers")
	s.NoError(err)
}

func (s *SupplierRepoTestSuite) TearDownSuite() {
	if s.testDB != nil {
		s.testDB.Teardown(context.Background())
	}
}

func (s *SupplierRepoTestSuite) TestCRUD() {
	ctx := context.Background()
	
	// 1. Create
	sup := &domain.Supplier{Name: "Supplier 1", Region: "north"}
	created, err := s.repo.Create(ctx, sup)
	s.NoError(err)
	s.NotEqual(uuid.Nil, created.ID)
	s.Equal("Supplier 1", created.Name)

	// 2. GetByID
	found, err := s.repo.GetByID(ctx, created.ID)
	s.NoError(err)
	s.Equal(created.ID, found.ID)

	_, err = s.repo.GetByID(ctx, uuid.New())
	s.NoError(err)

	// 3. Update
	created.Name = "Supplier Updated"
	created.IsActive = false
	updated, err := s.repo.Update(ctx, created)
	s.NoError(err)
	s.Equal("Supplier Updated", updated.Name)
	s.False(updated.IsActive)

	// 4. Delete
	err = s.repo.Delete(ctx, created.ID)
	s.NoError(err)

	// Verify Soft Delete
	notFound, err := s.repo.GetByID(ctx, created.ID)
	s.NoError(err)
	s.Nil(notFound)
}

func TestSupplierRepoSuite(t *testing.T) {
	suite.Run(t, new(SupplierRepoTestSuite))
}
