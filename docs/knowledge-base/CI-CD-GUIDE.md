# CI/CD Beginner's Guide

## What is CI/CD?

**CI/CD** stands for two related practices:

- **CI (Continuous Integration)**: Automatically test your code every time you push changes
- **CD (Continuous Delivery/Deployment)**: Automatically build and deploy your code to production

### Why Use CI/CD?

1. **Catch bugs early** - Tests run automatically before code is merged
2. **Reduce manual work** - No more running commands manually on your server
3. **Consistent deployments** - Same process every time, fewer human errors
4. **Team coordination** - Everyone knows the code quality standards

---

## How GitHub Actions Works

GitHub Actions is GitHub's built-in CI/CD platform. It watches your repository and automatically runs workflows when certain events happen (like pushing code).

### Key Concepts

#### **Workflow**
A workflow is an automated process defined in a YAML file. It runs in response to events.

**Location**: `.github/workflows/` directory in your repository

```
.github/
└── workflows/
    ├── tests.yml          # Run tests
    ├── build.yml          # Build Docker image
    ├── lint.yml           # Code quality checks
    └── deploy.yml         # Deploy to production
```

#### **Event**
What triggers the workflow to run:
- `push` - When you push code
- `pull_request` - When someone creates a PR
- `schedule` - On a schedule (like daily)

#### **Job**
A set of steps that runs on a runner (virtual machine).

#### **Step**
Individual commands or actions that run within a job.

#### **Action**
A reusable piece of code/tool provided by GitHub or the community. Think of it as a function you can call.

---

## Basic Workflow Structure

```yaml
name: Test Suite

# When to run this workflow
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

# What to do
jobs:
  test:
    # Which OS to use (ubuntu, macos, windows)
    runs-on: ubuntu-latest
    
    steps:
      # Step 1: Get your code
      - uses: actions/checkout@v3
      
      # Step 2: Set up Go
      - uses: actions/setup-go@v4
        with:
          go-version: '1.26'
      
      # Step 3: Run tests
      - run: go test ./...
```

### Breaking It Down

| Part | Purpose |
|------|---------|
| `name` | Display name in GitHub UI |
| `on` | Events that trigger the workflow |
| `jobs` | What work to do (can have multiple) |
| `runs-on` | Virtual machine OS to use |
| `uses` | Run a pre-built action |
| `run` | Run a shell command |

---

## For Your Project: bakerio

Your project uses:
- **Go backend** (1.26.1)
- **PostgreSQL database**
- **Docker** for containerization
- **sqlc** for database queries

### Implementation Plan

**Automated in GitHub Actions:**

### 1. **Build** (`build.yml`)
- Build Docker image
- Push to registry

### 2. **Migrations** (`migrations.yml`)
- Validate database migrations
- Ensure rollbacks work

### 3. **Deploy** (`deploy.yml`)
- Deploy to production server
- Run migrations
- Start services

**Manual (run locally before pushing):**

### 4. **Tests** (`tests.yml` - documented, not automated)
- Run Go tests locally
- Verify database migrations
- Check code compiles

### 5. **Linting** (`lint.yml` - documented, not automated)
- Check code style locally (golangci-lint)
- Verify formatting locally

**See [QUICKSTART.md](QUICKSTART.md) for setup order.**

---

## Common GitHub Actions for Go

### Setup Go
```yaml
- uses: actions/setup-go@v4
  with:
    go-version: '1.26.1'
```

### Checkout Code
```yaml
- uses: actions/checkout@v3
```

### Run Tests
```yaml
- run: go test ./...
```

### Run Linter
```yaml
- uses: golangci/golangci-lint-action@v3
```

### Build Docker Image
```yaml
- uses: docker/build-push-action@v4
  with:
    context: ./backend
    push: true
    tags: myregistry/bakerio:latest
```

---

## Environment Variables & Secrets

### Public Values (`.env` files)
Don't commit to GitHub. Always use for database names, ports, etc.

### Secrets (GitHub Secrets)
Used for sensitive data like passwords, API keys, deployment credentials.

**Where to set**: GitHub repo → Settings → Secrets and variables → Actions

**How to use in workflow**:
```yaml
- run: deploy
  env:
    DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
    DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
```

---

## Status Checks

After setting up workflows, GitHub will show status checks on pull requests:

- ✅ Tests passed
- ✅ Linting passed
- ❌ Build failed
- ❌ Deploy failed

**Branch protection**: You can require all checks to pass before merging to main.

---

## Next Steps

1. Create `.github/workflows/` directory
2. Start with `build.yml` (Docker builds)
3. Add `migrations.yml` for database validation
4. Add `deploy.yml` when ready for production
5. Run `tests` and `linting` locally before every push (see docs for how)

See [QUICKSTART.md](QUICKSTART.md) for detailed setup instructions.
