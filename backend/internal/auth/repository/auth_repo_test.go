package repository

import (
	"context"
	"testing"

	"github.com/google/uuid"
	authdb "github.com/octguy/bakerio/backend/db/sqlc/auth"
	"github.com/octguy/bakerio/backend/internal/platform/database"
	"github.com/stretchr/testify/suite"
)

type AuthRepoTestSuite struct {
	suite.Suite
	repo   AuthRepository
	testDB *database.TestDB
}

func (s *AuthRepoTestSuite) SetupSuite() {
	ctx := context.Background()
	tdb, err := database.SetupTestDatabase(ctx)
	if err != nil {
		s.FailNow("Failed to setup test database", err)
	}

	s.testDB = tdb
	s.repo = NewAuthRepo(authdb.New(tdb.Pool))
}

func (s *AuthRepoTestSuite) TearDownTest() {
	_, err := s.testDB.Pool.Exec(context.Background(), "DELETE FROM auth.auth_credentials")
	s.NoError(err)
	_, err = s.testDB.Pool.Exec(context.Background(), "DELETE FROM auth.users")
	s.NoError(err)
}

func (s *AuthRepoTestSuite) TearDownSuite() {
	if s.testDB != nil {
		s.testDB.Teardown(context.Background())
	}
}

func (s *AuthRepoTestSuite) TestCreateAccount() {
	ctx := context.Background()
	email := "test@example.com"
	password := "hashed_password"

	user, err := s.repo.CreateAccount(ctx, email, password, nil)

	s.NoError(err)
	s.NotEqual(uuid.Nil, user.ID)
	s.Equal(email, user.Email)
	s.False(user.EmailVerified)
	s.False(user.IsActive)

	// Verify credentials
	hash, err := s.repo.GetCredentialsByUserID(ctx, user.ID)
	s.NoError(err)
	s.Equal(password, hash)
}

func (s *AuthRepoTestSuite) TestFindUserByEmail() {
	ctx := context.Background()
	email := "find@example.com"
	s.repo.CreateAccount(ctx, email, "pass", nil)

	user, err := s.repo.FindUserByEmail(ctx, email)

	s.NoError(err)
	s.Equal(email, user.Email)
}

func (s *AuthRepoTestSuite) TestActivateUser() {
	ctx := context.Background()
	user, _ := s.repo.CreateAccount(ctx, "active@example.com", "pass", nil)

	err := s.repo.ActivateUser(ctx, user.ID)
	s.NoError(err)

	updated, _ := s.repo.FindUserByID(ctx, user.ID)
	s.True(updated.IsActive)
	s.True(updated.EmailVerified)
}

func TestAuthRepoSuite(t *testing.T) {
	suite.Run(t, new(AuthRepoTestSuite))
}
