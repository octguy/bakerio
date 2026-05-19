package repository

import (
	"context"
	"testing"

	"github.com/google/uuid"
	productdb "github.com/octguy/bakerio/backend/db/sqlc/product"
	"github.com/octguy/bakerio/backend/internal/platform/database"
	"github.com/stretchr/testify/suite"
)

type CategoryRepoTestSuite struct {
	suite.Suite
	repo   CategoryRepository
	testDB *database.TestDB
}

func (s *CategoryRepoTestSuite) SetupSuite() {
	ctx := context.Background()
	tdb, err := database.SetupTestDatabase(ctx)
	if err != nil {
		s.FailNow("Failed to setup test database", err)
	}

	s.testDB = tdb
	s.repo = NewCategoryRepository(productdb.New(tdb.Pool))
}

func (s *CategoryRepoTestSuite) TearDownTest() {
	_, err := s.testDB.Pool.Exec(context.Background(), "DELETE FROM product.categories")
	s.NoError(err)
}

func (s *CategoryRepoTestSuite) TearDownSuite() {
	if s.testDB != nil {
		s.testDB.Teardown(context.Background())
	}
}

func (s *CategoryRepoTestSuite) TestCreate() {
	ctx := context.Background()

	tests := []struct {
		name      string
		catName   string
		slug      string
		parentID  *uuid.UUID
		sortOrder int32
	}{
		{
			name:      "Root Category",
			catName:   "Cakes",
			slug:      "cakes",
			parentID:  nil,
			sortOrder: 1,
		},
	}

	for _, tt := range tests {
		s.Run(tt.name, func() {
			cat, err := s.repo.Create(ctx, tt.catName, tt.slug, tt.parentID, tt.sortOrder)

			s.NoError(err)
			s.NotEqual(uuid.Nil, cat.ID)
			s.Equal(tt.catName, cat.Name)
			s.Equal(tt.slug, cat.Slug)
			s.Equal(tt.parentID, cat.ParentID)
			s.Equal(tt.sortOrder, cat.SortOrder)
			s.True(cat.IsActive)
		})
	}
}

func (s *CategoryRepoTestSuite) TestGetByID() {
	ctx := context.Background()

	created, err := s.repo.Create(ctx, "Bread", "bread", nil, 0)
	s.NoError(err)

	found, err := s.repo.GetByID(ctx, created.ID)
	s.NoError(err)
	s.Equal(created.ID, found.ID)
	s.Equal("Bread", found.Name)

	// Test Not Found — returns nil, nil after ErrNoRows fix
	notFound, err := s.repo.GetByID(ctx, uuid.New())
	s.NoError(err)
	s.Nil(notFound)
}

func (s *CategoryRepoTestSuite) TestGetBySlug() {
	ctx := context.Background()

	created, err := s.repo.Create(ctx, "Pastry", "pastry", nil, 0)
	s.NoError(err)

	found, err := s.repo.GetBySlug(ctx, "pastry")
	s.NoError(err)
	s.Equal(created.ID, found.ID)
	s.Equal("Pastry", found.Name)
}

func (s *CategoryRepoTestSuite) TestList() {
	ctx := context.Background()

	_, _ = s.repo.Create(ctx, "Cat 1", "cat-1", nil, 0)
	_, _ = s.repo.Create(ctx, "Cat 2", "cat-2", nil, 0)

	list, err := s.repo.List(ctx)
	s.NoError(err)
	s.Len(list, 2)
}

func (s *CategoryRepoTestSuite) TestUpdate() {
	ctx := context.Background()

	cat, _ := s.repo.Create(ctx, "Old Name", "old-name", nil, 0)

	updated, err := s.repo.Update(ctx, cat.ID, "New Name", "new-name", nil, 5, false)
	s.NoError(err)
	s.Equal("New Name", updated.Name)
	s.Equal("new-name", updated.Slug)
	s.Equal(int32(5), updated.SortOrder)
	s.False(updated.IsActive)
}

func (s *CategoryRepoTestSuite) TestDelete() {
	ctx := context.Background()

	cat, _ := s.repo.Create(ctx, "To Delete", "to-delete", nil, 0)

	err := s.repo.Delete(ctx, cat.ID)
	s.NoError(err)

	// Verify it's soft deleted (returns nil, nil after ErrNoRows fix)
	notFound, err := s.repo.GetByID(ctx, cat.ID)
	s.NoError(err)
	s.Nil(notFound)
}

func TestCategoryRepoSuite(t *testing.T) {
	suite.Run(t, new(CategoryRepoTestSuite))
}
