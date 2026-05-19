package service

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/suite"
)

// --- 1. MOCKS ---

type MockRBACRepo struct {
	mock.Mock
}

func (m *MockRBACRepo) GetUserRoles(ctx context.Context, userID uuid.UUID) ([]string, error) {
	args := m.Called(ctx, userID)
	return args.Get(0).([]string), args.Error(1)
}

func (m *MockRBACRepo) GetPermissionsByRole(ctx context.Context, roleName string) ([]string, error) {
	args := m.Called(ctx, roleName)
	return args.Get(0).([]string), args.Error(1)
}

func (m *MockRBACRepo) GetAllRoles(ctx context.Context) ([]string, error) {
	args := m.Called(ctx)
	return args.Get(0).([]string), args.Error(1)
}

func (m *MockRBACRepo) AssignRole(ctx context.Context, userID uuid.UUID, roleName string) error {
	args := m.Called(ctx, userID, roleName)
	return args.Error(0)
}

func (m *MockRBACRepo) RemoveRole(ctx context.Context, userID uuid.UUID, roleName string) error {
	args := m.Called(ctx, userID, roleName)
	return args.Error(0)
}

// --- 2. TEST SUITE ---

type RBACServiceTestSuite struct {
	suite.Suite
	mockRepo  *MockRBACRepo
	mockCache *MockCache
	service   RBACService
}

func (s *RBACServiceTestSuite) SetupTest() {
	s.mockRepo = new(MockRBACRepo)
	s.mockCache = new(MockCache)
	s.service = NewRBACService(s.mockRepo, s.mockCache)
}

// --- 3. TEST METHODS ---

func (s *RBACServiceTestSuite) TestGetUserRoles() {
	ctx := context.Background()
	userID := uuid.New()
	roles := []string{"admin", "member"}

	s.mockRepo.On("GetUserRoles", ctx, userID).Return(roles, nil).Once()

	result, err := s.service.GetUserRoles(ctx, userID)

	s.NoError(err)
	s.Equal(roles, result)
	s.mockRepo.AssertExpectations(s.T())
}

func (s *RBACServiceTestSuite) TestResolvePermissions() {
	ctx := context.Background()
	roles := []string{"role1", "role2"}
	perms1 := []string{"p1", "p2"}
	perms2 := []string{"p2", "p3"}

	s.Run("Cache Hit", func() {
		data1, _ := json.Marshal(perms1)
		s.mockCache.On("Get", ctx, permCachePrefix+"role1").Return(string(data1), nil).Once()
		
		data2, _ := json.Marshal(perms2)
		s.mockCache.On("Get", ctx, permCachePrefix+"role2").Return(string(data2), nil).Once()

		result, err := s.service.ResolvePermissions(ctx, roles)

		s.NoError(err)
		s.ElementsMatch([]string{"p1", "p2", "p3"}, result)
	})

	s.Run("Cache Miss - DB Fallback", func() {
		s.mockCache.On("Get", ctx, permCachePrefix+"role1").Return("", nil).Once()
		s.mockRepo.On("GetPermissionsByRole", ctx, "role1").Return(perms1, nil).Once()
		s.mockCache.On("Set", ctx, permCachePrefix+"role1", mock.Anything, permCacheTTL).Return(nil).Once()

		s.mockCache.On("Get", ctx, permCachePrefix+"role2").Return("", nil).Once()
		s.mockRepo.On("GetPermissionsByRole", ctx, "role2").Return(perms2, nil).Once()
		s.mockCache.On("Set", ctx, permCachePrefix+"role2", mock.Anything, permCacheTTL).Return(nil).Once()

		result, err := s.service.ResolvePermissions(ctx, roles)

		s.NoError(err)
		s.ElementsMatch([]string{"p1", "p2", "p3"}, result)
	})
}

func (s *RBACServiceTestSuite) TestWarmPermissionCache() {
	ctx := context.Background()
	roles := []string{"admin", "member"}
	perms := []string{"p1"}

	s.mockRepo.On("GetAllRoles", ctx).Return(roles, nil).Once()
	s.mockRepo.On("GetPermissionsByRole", ctx, "admin").Return(perms, nil).Once()
	s.mockRepo.On("GetPermissionsByRole", ctx, "member").Return(perms, nil).Once()
	
	s.mockCache.On("Set", ctx, permCachePrefix+"admin", mock.Anything, permCacheTTL).Return(nil).Once()
	s.mockCache.On("Set", ctx, permCachePrefix+"member", mock.Anything, permCacheTTL).Return(nil).Once()

	err := s.service.WarmPermissionCache(ctx)

	s.NoError(err)
	s.mockRepo.AssertExpectations(s.T())
	s.mockCache.AssertExpectations(s.T())
}

func (s *RBACServiceTestSuite) TestAssignRemoveRole() {
	ctx := context.Background()
	userID := uuid.New()
	role := "staff"

	s.Run("Assign", func() {
		s.mockRepo.On("AssignRole", ctx, userID, role).Return(nil).Once()
		s.mockCache.On("Del", ctx, permCachePrefix+role).Return(nil).Once()
		err := s.service.AssignRole(ctx, userID, role)
		s.NoError(err)
	})

	s.Run("Remove", func() {
		s.mockRepo.On("RemoveRole", ctx, userID, role).Return(nil).Once()
		s.mockCache.On("Del", ctx, permCachePrefix+role).Return(nil).Once()
		err := s.service.RemoveRole(ctx, userID, role)
		s.NoError(err)
	})
}

func TestRBACServiceSuite(t *testing.T) {
	suite.Run(t, new(RBACServiceTestSuite))
}
