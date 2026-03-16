# Workflow: Run Tests

## What This Does

Runs Go tests and validates your code compiles correctly every time you push.

## When It Runs

- On every push to `main` or `develop` branches
- On every pull request to `main`

## Complete Workflow File

Create `.github/workflows/tests.yml`:

```yaml
name: Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: testuser
          POSTGRES_PASSWORD: testpass
          POSTGRES_DB: bakeriodb
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      # Step 1: Checkout your code
      - uses: actions/checkout@v3
      
      # Step 2: Set up Go
      - uses: actions/setup-go@v4
        with:
          go-version: '1.26.1'
      
      # Step 3: Download dependencies
      - run: cd backend && go mod download
      
      # Step 4: Build the project
      - run: cd backend && go build ./cmd/server
      
      # Step 5: Run tests
      - run: cd backend && go test ./... -v
        env:
          DB_HOST: localhost
          DB_PORT: 5432
          DB_USER: testuser
          DB_PASSWORD: testpass
          DB_NAME: bakeriodb
          DB_SSLMODE: disable
      
      # Step 6: Generate sqlc (ensure migrations match code)
      - run: cd backend && go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest
      - run: cd backend && sqlc generate
      - run: cd backend && git diff --exit-code
        if: failure()
        continue-on-error: true
```

## What Each Step Does

| Step | Purpose |
|------|---------|
| **Checkout** | Copies your code into the runner |
| **Setup Go** | Installs Go 1.26.1 |
| **Download deps** | Runs `go mod download` |
| **Build** | Compiles your binary to catch syntax errors |
| **Run tests** | Executes all `*_test.go` files |
| **Verify sqlc** | Checks generated code matches migrations |

## How to Write Tests

Create test files with `_test.go` suffix:

```go
// cmd/server/main_test.go
package main

import "testing"

func TestAdd(t *testing.T) {
    result := 2 + 2
    if result != 4 {
        t.Errorf("Expected 4, got %d", result)
    }
}
```

Run locally:
```bash
cd backend && go test ./...
```

## Services Section Explained

The `services` section starts a PostgreSQL database that your tests can use:

```yaml
services:
  postgres:
    image: postgres:16-alpine  # Use same version as production
    env:
      POSTGRES_USER: testuser
      POSTGRES_PASSWORD: testpass
      POSTGRES_DB: bakeriodb
    options: >-  # Wait for database to be ready
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
    ports:
      - 5432:5432  # Expose on localhost:5432
```

Your code connects via: `localhost:5432` (inside the runner)

## Environment Variables

These are set for the test job:
- `DB_HOST: localhost` - PostgreSQL service hostname
- `DB_PORT: 5432` - PostgreSQL port
- `DB_USER: testuser` - Username from postgres service
- `DB_PASSWORD: testpass` - Password from postgres service
- `DB_NAME: bakeriodb` - Database name from postgres service
- `DB_SSLMODE: disable` - Don't require SSL for test Database

Make sure your code reads these from environment variables.

## Common Issues

### Tests pass locally but fail in GitHub Actions

**Cause**: Different environment, missing dependencies

**Solution**:
- Ensure all environment variables are set in the workflow
- Check database migrations are up to date
- Verify Go version matches locally

### "Can't connect to database"

**Cause**: Postgres service isn't ready

**Solution**: The `--health-cmd` in services already waits. Make sure it's there.

### Tests timeout

**Solution**: Increase timeout (default 5 minutes):
```yaml
jobs:
  test:
    timeout-minutes: 10
```

## Next: Add Status Check Requirement

In GitHub repo settings:
1. Settings → Branches → main
2. Add status check: "Tests" must pass before merging

This prevents broken code from reaching main.
