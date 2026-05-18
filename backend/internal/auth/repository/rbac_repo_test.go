package repository

import (
	"context"
	"testing"

	authdb "github.com/octguy/bakerio/backend/db/sqlc/auth"
	"github.com/octguy/bakerio/backend/internal/platform/database"
	"github.com/stretchr/testify/suite"
)

type RBACRepoTestSuite struct {
	suite.Suite
	repo     RBACRepository
	authRepo AuthRepository
	testDB   *database.TestDB
}

func (s *RBACRepoTestSuite) SetupSuite() {
	ctx := context.Background()
	tdb, err := database.SetupTestDatabase(ctx)
	if err != nil {
		s.FailNow("Failed to setup test database", err)
	}

	s.testDB = tdb
	queries := authdb.New(tdb.Pool)
	s.repo = NewRBACRepo(queries)
	s.authRepo = NewAuthRepo(queries)
}

func (s *RBACRepoTestSuite) TearDownTest() {
	_, _ = s.testDB.Pool.Exec(context.Background(), "DELETE FROM auth.user_roles")
	_, _ = s.testDB.Pool.Exec(context.Background(), "DELETE FROM auth.auth_credentials")
	_, _ = s.testDB.Pool.Exec(context.Background(), "DELETE FROM auth.users")
}

func (s *RBACRepoTestSuite) TearDownSuite() {
	if s.testDB != nil {
		s.testDB.Teardown(context.Background())
	}
}

func (s *RBACRepoTestSuite) TestAssignAndGetRoles() {
	ctx := context.Background()
	user, _ := s.authRepo.CreateAccount(ctx, "rbac@example.com", "pass", nil)

	// "member" role should exist from migrations
	err := s.repo.AssignRole(ctx, user.ID, "member")
	s.NoError(err)

	roles, err := s.repo.GetUserRoles(ctx, user.ID)
	s.NoError(err)
	s.Contains(roles, "member")
}

func (s *RBACRepoTestSuite) TestRemoveRole() {
	ctx := context.Background()
	user, _ := s.authRepo.CreateAccount(ctx, "remove@example.com", "pass", nil)
	s.repo.AssignRole(ctx, user.ID, "member")

	err := s.repo.RemoveRole(ctx, user.ID, "member")
	s.NoError(err)

	roles, _ := s.repo.GetUserRoles(ctx, user.ID)
	s.NotContains(roles, "member")
}

func (s *RBACRepoTestSuite) TestGetPermissionsByRole() {
	ctx := context.Background()
	
	// "super_admin" should have some permissions from migrations
	perms, err := s.repo.GetPermissionsByRole(ctx, "super_admin")
	s.NoError(err)
	s.NotEmpty(perms)
}

func TestRBACRepoSuite(t *testing.T) {
	suite.Run(t, new(RBACRepoTestSuite))
}
