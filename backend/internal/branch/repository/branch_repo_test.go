package repository

import (
	"context"
	"os"
	"testing"

	"github.com/google/uuid"
	branchdb "github.com/octguy/bakerio/backend/db/sqlc/branch"
	"github.com/octguy/bakerio/backend/internal/platform/database"
	"github.com/stretchr/testify/suite"
)

type BranchRepoTestSuite struct {
	suite.Suite
	repo BranchRepository
	pool *database.Postgres // Adjust based on your platform/database struct
}

func (s *BranchRepoTestSuite) SetupSuite() {
	ctx := context.Background()
	
	// Try to get DSN from environment, fallback to a local default
	dsn := os.Getenv("TEST_DB_URL")
	if dsn == "" {
		// Default local test DB (update with your credentials)
		dsn = "postgres://postgres:postgres@localhost:5432/bakerio_test?sslmode=disable"
	}

	// Connect using your existing platform helper
	pool, err := database.Connect(ctx, dsn)
	if err != nil {
		s.FailNow("Failed to connect to test database. Ensure 'bakerio_test' exists and migrations are run.", err)
	}

	s.repo = NewBranchRepository(branchdb.New(pool))
	s.pool = &database.Postgres{Pool: pool}
}

func (s *BranchRepoTestSuite) TearDownTest() {
	// Clean up the table after every test to ensure isolation
	_, err := s.pool.Pool.Exec(context.Background(), "DELETE FROM branch.branches")
	s.NoError(err)
}

func (s *BranchRepoTestSuite) TearDownSuite() {
	if s.pool != nil {
		s.pool.Close()
	}
}

// --- TEST CASES ---

func (s *BranchRepoTestSuite) TestCreateBranch() {
	ctx := context.Background()
	lat, lng := 10.762622, 106.660172 // Ho Chi Minh City coordinates

	tests := []struct {
		name    string
		bName   string
		address string
		lat     *float64
		lng     *float64
	}{
		{
			name:    "Successful Creation",
			bName:   "District 1 Store",
			address: "123 Le Loi, D1",
			lat:     &lat,
			lng:     &lng,
		},
		{
			name:    "Creation without Coordinates",
			bName:   "Online Only",
			address: "Virtual",
			lat:     nil,
			lng:     nil,
		},
	}

	for _, tt := range tests {
		s.Run(tt.name, func() {
			branch, err := s.repo.CreateBranch(ctx, tt.bName, tt.address, tt.lat, tt.lng)

			s.NoError(err)
			s.NotEqual(uuid.Nil, branch.ID)
			s.Equal(tt.bName, branch.Name)
			s.Equal(tt.address, branch.Address)
			
			if tt.lat != nil {
				s.Equal(*tt.lat, *branch.Lat)
				s.Equal(*tt.lng, *branch.Lng)
			}
		})
	}
}

func (s *BranchRepoTestSuite) TestGetBranchByID() {
	ctx := context.Background()
	
	// 1. Setup: Create a branch to find
	created, err := s.repo.CreateBranch(ctx, "Target Branch", "Target Addr", nil, nil)
	s.NoError(err)

	// 2. Act: Find it
	found, err := s.repo.GetBranchByID(ctx, created.ID)

	// 3. Assert
	s.NoError(err)
	s.Equal(created.ID, found.ID)
	s.Equal("Target Branch", found.Name)

	// 4. Test Not Found
	nilBranch, err := s.repo.GetBranchByID(ctx, uuid.New())
	s.Error(err)
	s.Nil(nilBranch)
}

func (s *BranchRepoTestSuite) TestGetAllBranches() {
	ctx := context.Background()
	
	// 1. Setup: Insert multiple branches
	_, _ = s.repo.CreateBranch(ctx, "B1", "A1", nil, nil)
	_, _ = s.repo.CreateBranch(ctx, "B2", "A2", nil, nil)

	// 2. Act
	branches, err := s.repo.GetAllBranches(ctx)

	// 3. Assert
	s.NoError(err)
	s.Len(branches, 2)
}

func (s *BranchRepoTestSuite) TestUpdateBranch() {
	ctx := context.Background()
	lat, lng := 10.0, 20.0

	// Setup: Create a common base branch to update
	branch, _ := s.repo.CreateBranch(ctx, "Base Name", "Base Addr", &lat, &lng)

	tests := []struct {
		name    string
		newName string
		newAddr string
		newLat  *float64
		newLng  *float64
	}{
		{
			name:    "Update Name and Address",
			newName: "Updated Name",
			newAddr: "Updated Address",
			newLat:  &lat,
			newLng:  &lng,
		},
		{
			name:    "Clear Coordinates (Null transition)",
			newName: "Base Name",
			newAddr: "Base Addr",
			newLat:  nil,
			newLng:  nil,
		},
	}

	for _, tt := range tests {
		s.Run(tt.name, func() {
			updated, err := s.repo.UpdateBranch(ctx, branch.ID, tt.newName, tt.newAddr, tt.newLat, tt.newLng)

			s.NoError(err)
			s.Equal(tt.newName, updated.Name)
			s.Equal(tt.newAddr, updated.Address)
			s.Equal(tt.newLat, updated.Lat)
			s.Equal(tt.newLng, updated.Lng)
		})
	}
}

func (s *BranchRepoTestSuite) TestUpdateBranchStatus() {
	ctx := context.Background()

	// 1. Setup: Create a branch
	branch, err := s.repo.CreateBranch(ctx, "Status Test", "Addr", nil, nil)
	s.NoError(err)

	// 2. Act: Update status
	err = s.repo.UpdateBranchStatus(ctx, branch.ID, "inactive")

	// 3. Assert
	s.NoError(err)

	// Verify change
	found, _ := s.repo.GetBranchByID(ctx, branch.ID)
	s.Equal("inactive", found.Status)
}

func TestBranchRepoSuite(t *testing.T) {
	suite.Run(t, new(BranchRepoTestSuite))
}
