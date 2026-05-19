package repository

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	branchdb "github.com/octguy/bakerio/backend/db/sqlc/branch"
	"github.com/octguy/bakerio/backend/internal/platform/database"
	"github.com/stretchr/testify/suite"
)

type BranchRepoTestSuite struct {
	suite.Suite
	repo   BranchRepository
	testDB *database.TestDB
}

func (s *BranchRepoTestSuite) SetupSuite() {
	ctx := context.Background()
	tdb, err := database.SetupTestDatabase(ctx)
	if err != nil {
		s.FailNow("Failed to setup test database", err)
	}

	s.testDB = tdb
	s.repo = NewBranchRepository(branchdb.New(tdb.Pool))
}

func (s *BranchRepoTestSuite) TearDownTest() {
	_, err := s.testDB.Pool.Exec(context.Background(), "DELETE FROM branch.branches")
	s.NoError(err)
}

func (s *BranchRepoTestSuite) TearDownSuite() {
	if s.testDB != nil {
		s.testDB.Teardown(context.Background())
	}
}

func (s *BranchRepoTestSuite) TestCreateBranch() {
	ctx := context.Background()
	lat, lng := 10.762622, 106.660172

	tests := []struct {
		name    string
		bName   string
		address string
		lat     *float64
		lng     *float64
		region  string
	}{
		{
			name:    "Successful Creation",
			bName:   "District 1 Store",
			address: "123 Le Loi, D1",
			lat:     &lat,
			lng:     &lng,
			region:  "south",
		},
	}

	for _, tt := range tests {
		s.Run(tt.name, func() {
			branch, err := s.repo.CreateBranch(ctx, tt.bName, tt.address, tt.lat, tt.lng, tt.region)

			s.NoError(err)
			s.NotEqual(uuid.Nil, branch.ID)
			s.Equal(tt.bName, branch.Name)
			s.Equal(tt.address, branch.Address)
			s.Equal(tt.region, branch.Region)
			s.NotZero(branch.CreatedAt)
			s.NotZero(branch.UpdatedAt)
			s.Nil(branch.DeletedAt)
		})
	}
}

func (s *BranchRepoTestSuite) TestSoftDeleteBranch() {
	ctx := context.Background()
	branch, _ := s.repo.CreateBranch(ctx, "To Delete", "Addr", nil, nil, "south")

	err := s.repo.SoftDeleteBranch(ctx, branch.ID)
	s.NoError(err)

	// Should not be findable via GetByID anymore (returns nil, nil after ErrNoRows fix)
	found, err := s.repo.GetBranchByID(ctx, branch.ID)
	s.NoError(err)
	s.Nil(found)

	// Verify it still exists in DB but with deleted_at set
	var deletedAt *time.Time
	err = s.testDB.Pool.QueryRow(ctx, "SELECT deleted_at FROM branch.branches WHERE id = $1", branch.ID).Scan(&deletedAt)
	s.NoError(err)
	s.NotNil(deletedAt)
}

func (s *BranchRepoTestSuite) TestGetAllBranches() {
	ctx := context.Background()
	_, _ = s.repo.CreateBranch(ctx, "B1", "Addr1", nil, nil, "south")
	b2, _ := s.repo.CreateBranch(ctx, "B2", "Addr2", nil, nil, "north")

	_ = s.repo.SoftDeleteBranch(ctx, b2.ID)

	branches, err := s.repo.GetAllBranches(ctx)
	s.NoError(err)
	s.Len(branches, 1)
	s.Equal("B1", branches[0].Name)
}

func (s *BranchRepoTestSuite) TestUpdateBranch() {
	ctx := context.Background()
	b, _ := s.repo.CreateBranch(ctx, "B1", "Addr1", nil, nil, "south")

	lat := 1.0
	updated, err := s.repo.UpdateBranch(ctx, b.ID, "B1 Updated", "Addr Updated", &lat, nil, "north")
	s.NoError(err)
	s.Equal("B1 Updated", updated.Name)
	s.Equal("Addr Updated", updated.Address)
	s.Equal("north", updated.Region)
	s.NotNil(updated.Lat)
	s.Nil(updated.Lng)

	// Ensure error on invalid ID
	_, err = s.repo.UpdateBranch(ctx, uuid.New(), "B1", "Addr", nil, nil, "south")
	s.Error(err)
}

func (s *BranchRepoTestSuite) TestUpdateBranchStatus() {
	ctx := context.Background()
	b, _ := s.repo.CreateBranch(ctx, "B1", "Addr1", nil, nil, "south")

	err := s.repo.UpdateBranchStatus(ctx, b.ID, "inactive")
	s.NoError(err)

	found, _ := s.repo.GetBranchByID(ctx, b.ID)
	s.Equal("inactive", found.Status)
}

func TestBranchRepoSuite(t *testing.T) {
	suite.Run(t, new(BranchRepoTestSuite))
}
