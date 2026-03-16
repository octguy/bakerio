# Workflow: Database Migrations Validation

## What This Does

Verifies that:
- Database migrations apply successfully
- No conflicts between migrations
- Rollbacks work correctly
- Schema matches expected state

## When It Runs

- On every push to `main` or `develop` branches
- On every pull request to `main`

## Complete Workflow File

Create `.github/workflows/migrations.yml`:

```yaml
name: Database Migrations

on:
  push:
    branches: [ main, develop ]
    paths:
      - 'backend/db/migrations/**'
      - '.github/workflows/migrations.yml'
  pull_request:
    branches: [ main ]
    paths:
      - 'backend/db/migrations/**'

jobs:
  migrations:
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
      # Step 1: Checkout code
      - uses: actions/checkout@v3
      
      # Step 2: Install migrate CLI
      - uses: golang-migrate/setup-migrate@v3
      
      # Step 3: Run migrations up
      - name: Run migrations up
        run: |
          migrate -path backend/db/migrations \
            -database "postgres://testuser:testpass@localhost:5432/bakeriodb?sslmode=disable" \
            up
        env:
          POSTGRES_HOST: localhost
      
      # Step 4: Verify schema (optional)
      - name: Check schema
        run: |
          psql -h localhost -U testuser -d bakeriodb -c "\dt"
        env:
          PGPASSWORD: testpass
      
      # Step 5: Test rollback (run down then up again)
      - name: Test migration rollback
        run: |
          migrate -path backend/db/migrations \
            -database "postgres://testuser:testpass@localhost:5432/bakeriodb?sslmode=disable" \
            down 1
          
          migrate -path backend/db/migrations \
            -database "postgres://testuser:testpass@localhost:5432/bakeriodb?sslmode=disable" \
            up
        env:
          POSTGRES_HOST: localhost
```

## What Each Step Does

| Step | Purpose |
|------|---------|
| **Checkout** | Get your code |
| **Install migrate** | Download migration tool |
| **Run migrations up** | Apply all pending migrations |
| **Check schema** | Verify tables exist |
| **Test rollback** | Ensure down migrations work |

## Migration File Naming

Migrations follow a naming convention:

```
000001_init-user.up.sql      # Apply migration 1
000001_init-user.down.sql    # Rollback migration 1
000002_add-product-table.up.sql
000002_add-product-table.down.sql
```

Format: `NNNNNN_descriptive-name.{up|down}.sql`

- `NNNNNN` - 6-digit version number (001, 002, 003...)
- `descriptive-name` - What the migration does
- `up.sql` - Apply the change
- `down.sql` - Undo the change

## Understanding Migration Numbering

**Up migrations** (apply):
```
000001_init-user.up.sql       <- Creates users table
000002_add-product-table.up.sql <- Creates products table
```

**Down migrations** (rollback):
```
000002_add-product-table.down.sql <- Drops products table
000001_init-user.down.sql       <- Drops users table
```

When you rollback, migrations run in reverse order.

## The Database Service

```yaml
services:
  postgres:
    image: postgres:16-alpine  # Same version as production
    env:
      POSTGRES_USER: testuser
      POSTGRES_PASSWORD: testpass
      POSTGRES_DB: bakeriodb
    healthcheck:              # Wait for database
      test: ["CMD-SHELL", "pg_isready -U testuser"]
      interval: 10s
      timeout: 5s
      retries: 5
    ports:
      - 5432:5432           # Expose on localhost
```

This spins up a PostgreSQL database the workflow can connect to.

## Migration Validation

### Step 3: Run migrations up

```bash
migrate -path backend/db/migrations \
  -database "postgres://testuser:testpass@localhost:5432/bakeriodb?sslmode=disable" \
  up
```

This applies all migrations in order and checks for errors.

### Step 5: Test rollback

```bash
migrate down 1    # Roll back the last migration
migrate up        # Re-apply it
```

This verifies:
- Down migration works
- Up migration can run multiple times
- No data loss during rollback

## Common Migration Issues

### "dirty database" error

Caused by: A migration failed halfway, database state wasn't cleaned up.

**Solution**:
```bash
# Force version (dangerous, only if you know what you're doing)
migrate -path backend/db/migrations \
  -database "..." \
  force 2
```

Or drop database and start over.

### "relation already exists" error

Caused by: Running `up` twice, or `.up.sql` has code for something that already exists.

**Check your `.up.sql`**:
```sql
-- ❌ Wrong - assumes table doesn't exist
CREATE TABLE users (...)

-- ✅ Correct - idempotent
CREATE TABLE IF NOT EXISTS users (...)
```

### Migration fails, but `up` says it's applied

This is a "dirty" state. The migration marker was set before the SQL ran.

**Fix**:
```bash
migrate -path ... -database "..." down 1  # Go back
# Fix your .up.sql
migrate -path ... -database "..." up      # Try again
```

## Skipping Migration Checks

Only run this workflow when migrations change:

```yaml
on:
  push:
    paths:
      - 'backend/db/migrations/**'  # Only if migrations change
      - '.github/workflows/migrations.yml'
```

This avoids unnecessary runs when you just changed Go code.

## Useful Migration Commands

Run these locally before pushing:

```bash
# See current migration version
migrate -path backend/db/migrations \
  -database "postgres://..." \
  version

# Go up 1 migration
migrate -path backend/db/migrations \
  -database "postgres://..." \
  up 1

# Go down 1 migration
migrate -path backend/db/migrations \
  -database "postgres://..." \
  down 1

# Go to specific version
migrate -path backend/db/migrations \
  -database "postgres://..." \
  goto 2
```

## Integration with Tests

Your test workflow should also run migrations:

```yaml
# In tests.yml
- name: Run migrations
  run: |
    migrate -path backend/db/migrations \
      -database "postgres://testuser:testpass@localhost:5432/bakeriodb?sslmode=disable" \
      up
```

This ensures tests get a fully migrated database schema.
