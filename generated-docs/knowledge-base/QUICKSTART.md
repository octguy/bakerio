# CI/CD Quick Start for bakerio

## Overview

This guide walks through setting up GitHub Actions for your backend project, focusing on:
- **Build** workflows (Docker images)
- **Migrations** validation
- **Deploy** workflows (optional)

**Tests and Linting** are documented but not implemented as GitHub Actions workflows. Run these locally before pushing.

**Time to complete**: ~20 minutes

## Steps

### 1. Create Workflow Directory

```bash
cd /Users/octguy/personalize/tech/go/project/bakerio
mkdir -p .github/workflows
```

### 2. Implementation Focus

You're skipping Tests and Linting for now. Focus on:

#### Build (`build.yml`)
Creates Docker image for deployment.

**File**: `.github/workflows/build.yml`

Copy from: [Workflow: Build Docker](workflows/03-BUILD.md)

**Before using**:
- [ ] Create Docker Hub account (or use GitHub Container Registry)
- [ ] Set secrets: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`

**Test locally**:
```bash
cd backend && docker build -f Dockerfile -t bakerio:test .
```

#### Migrations (`migrations.yml`)
Validates database changes work correctly.

**File**: `.github/workflows/migrations.yml`

Copy from: [Workflow: Database Migrations](workflows/04-MIGRATIONS.md)

**No secrets needed**, runs in isolated PostgreSQL service.

#### Deploy (`deploy.yml`) - *Optional*
Automatically deploys to production after builds pass.

**File**: `.github/workflows/deploy.yml`

Copy from: [Workflow: Deploy to Production](workflows/05-DEPLOY.md)

**Before using**:
- [ ] Have a production server
- [ ] Generate SSH key for deployment
- [ ] Set secrets: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_PORT`

---

## Complete File Structure

After all steps, you'll have:

```
.github/
└── workflows/
    ├── build.yml          # Build Docker image
    ├── migrations.yml     # Database migrations
    └── deploy.yml         # Deploy to production (optional)

backend/
└── ... rest of backend
```

---

## Setting Up GitHub Secrets

Before your first push, add secrets to your repo:

1. GitHub: Your repo → Settings → Secrets and variables → Actions
2. New secret button
3. Add each secret:

### Required for Build workflow:
- `DOCKERHUB_USERNAME` - Your Docker Hub username
- `DOCKERHUB_TOKEN` - Your Docker Hub token (not password!)

### Required for Deploy workflow (optional):
- `DEPLOY_HOST` - Your server IP/domain
- `DEPLOY_USER` - SSH username
- `DEPLOY_SSH_KEY` - SSH private key
- `DEPLOY_PORT` - SSH port (usually 22)

---

## First Test Run

1. **Create one workflow** (start with `tests.yml`)
2. **Commit and push**:
```bash
git add .github/workflows/tests.yml
git commit -m "Add tests workflow"
git push origin main
```

3. **Watch it run**:
   - GitHub: Your repo → Actions tab
   - See workflow running
   - Check results

4. **Add next workflow** once first one succeeds

---

## Workflow Execution Order

When you push code, workflows run in parallel (in background):

```
Push to main
    ↓
┌──────────────┬──────────────┐
│  Build.yml   │ Migrations   │ (run in parallel)
└──────────────┴──────────────┘
    ↓ (optional)
┌────────────────┐
│  Deploy.yml    │ (only on main if enabled)
└────────────────┘
```

**Note**: Tests and Linting are skipped. Run these locally before pushing to ensure code quality.

## Monitoring Workflows

### In GitHub UI
- Actions tab → See all workflows
- Click workflow → See logs
- Failed? Click step to see error

### Enable Branch Protection
Require workflows to pass before merging:

1. Settings → Branches → main
2. Add rule
3. Require checks:
   - Build Docker Image
   - Database Migrations

Now PRs can't be merged if builds or migrations fail.

---

## Common First-Time Issues

| Problem | Solution |
|---------|----------|
| Tests fail locally | Run `cd backend && go test ./...` locally first |
| Docker login fails | Verify `DOCKERHUB_TOKEN` is actual token, not password |
| Migrations timeout | Increase `timeout-minutes` in workflow |
| SSH deploy fails | Verify public key on server: `cat ~/.ssh/authorized_keys` |
| Secrets not found | Make sure secret name matches exactly (case-sensitive) |

---

## Best Practices

### Local Workflow (Important!)
Since tests and linting aren't automated, run these locally **before pushing**:

```bash
# Format code
cd backend && gofmt -w .

# Run tests
cd backend && go test ./...

# Lint
cd backend && golangci-lint run ./...

# Build Docker image
docker build -f backend/Dockerfile ./backend
```

**This is your responsibility** since GitHub Actions won't catch these issues.

### Commit Messages
Be descriptive:
```bash
git commit -m "Add user authentication endpoint"
# Good - clear what changed

git commit -m "Fix"
# Bad - unclear
```

This helps in deployment logs.

### Use Feature Branches
For big changes:
```bash
git checkout -b feature/new-api
# Make changes
git push origin feature/new-api
# Create PR, tests run automatically
# After review, merge to main
```

---

## Learning Resources

- Concepts: See [CI-CD-GUIDE.md](CI-CD-GUIDE.md)
- GitHub Actions docs: https://docs.github.com/en/actions
- Docker docs: https://docs.docker.com/

---

## Checklist: Ready for Production

- [ ] Build workflow builds successfully
- [ ] Migrations validate correctly
- [ ] Branch protection enabled on `main`
- [ ] Deploy workflow configured (optional)
- [ ] Local test & lint scripts run before each push
- [ ] Team knows not to push to `main` directly (PRs only)

---

## Next Steps

1. **Start with build.yml** - Get Docker images building
2. **Add migrations.yml** - Validate database changes
3. **Add deploy.yml** - Auto-deploy when ready
4. **Run tests/lint locally** - Before every commit

Question? See the detailed docs in `workflows/` folder or [main CI/CD guide](CI-CD-GUIDE.md).
