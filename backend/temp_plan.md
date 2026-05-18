# Temporary Plan: Increase Test Coverage

## Goal
Improve the currently critically low test coverage (0% for core modules) and fix the broken repository tests.

## Steps

### Phase 1: Fix Repository Integration Tests
The repository tests (`branch_repo_test.go`, `category_repo_test.go`) currently fail because they attempt to connect to a local `bakerio_test` database that doesn't exist or has bad credentials.
- **Action:** Update the test setup in these files to use `github.com/testcontainers/testcontainers-go/modules/postgres` to automatically spin up a temporary PostgreSQL container and run the migrations (`db/migrations`) before executing the tests. This ensures the tests are fully isolated and CI/CD ready.

### Phase 2: Core Business Logic Tests (Auth & User)
Core modules currently have 0% coverage. We need unit tests that use mocking for dependencies to ensure fast execution and isolation.
- **Action (Auth):** Create `internal/auth/service/auth_service_test.go`. Mock the `AuthRepository`, `RBACService`, `ProfileCreator`, etc. using a mocking library like `github.com/stretchr/testify/mock`. Write tests covering `Register`, `Login` (success and failure paths), and `ValidateToken`.
- **Action (User):** Create `internal/user/service/user_service_test.go`. Mock `ProfileService` and `AuthService`. Test `CreateUser` with different branch context scenarios and permission scopes.

### Phase 3: Middleware Tests
Middleware is critical for security but is untested.
- **Action:** Create `internal/platform/middleware/jwt_test.go` and `internal/platform/middleware/permission_test.go`. Use `net/http/httptest` and `gin.CreateTestContext` to verify that `JWTAuth` correctly parses tokens and enriches the context, and that `RequirePermission` correctly allows or rejects requests based on the context.

## Execution Strategy
The `generalist` subagent will be invoked to execute these phases.
