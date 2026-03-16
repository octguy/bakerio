# Workflow: Deploy to Production

## What This Does

Automatically deploys your application to a production server:
- Pulls latest Docker image
- Stops old container
- Starts new container with latest code
- Runs database migrations
- Verifies service is healthy

## When It Runs

- Only on push to `main` branch (after tests/build pass)
- Manual trigger option available

## Prerequisites

Before setting up deployment:

1. **Production server** (VPS, AWS, DigitalOcean, etc.)
2. **SSH access** to the server
3. **Docker** installed on server
4. **SSH key** stored as GitHub secret
5. **Environment variables** stored as GitHub secrets

## Setting Up Deployment

### Step 1: Create SSH Key

On your local machine:
```bash
ssh-keygen -t ed25519 -f ~/.ssh/bakerio_deploy -C "GitHub Actions"
# Don't set a passphrase (Actions needs to use it automatically)
```

### Step 2: Add Public Key to Server

```bash
# Copy your public key
cat ~/.ssh/bakerio_deploy.pub

# On your production server
mkdir -p ~/.ssh
echo "PASTE_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### Step 3: Store Private Key in GitHub Secrets

1. Copy your private key:
```bash
cat ~/.ssh/bakerio_deploy | pbcopy  # macOS
# or
cat ~/.ssh/bakerio_deploy           # Display and copy manually
```

2. GitHub repo → Settings → Secrets and variables → Actions
3. Create secret `DEPLOY_SSH_KEY` and paste the private key

### Step 4: Store Server Details

Create these secrets:
- `DEPLOY_HOST`: Your server IP or domain (e.g., `123.45.67.89`)
- `DEPLOY_USER`: SSH user (usually `root` or your username)
- `DEPLOY_PORT`: SSH port (usually `22`)

## Complete Workflow File

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]
  workflow_dispatch:  # Allow manual triggering

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      # Step 1: Checkout code
      - uses: actions/checkout@v3
      
      # Step 2: SSH into server and deploy
      - name: Deploy application
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          key: ${{ secrets.DEPLOY_SSH_KEY }}
          port: ${{ secrets.DEPLOY_PORT }}
          script: |
            set -e  # Exit on error
            echo "🚀 Starting deployment..."
            
            # Navigate to project
            cd ~/bakerio
            
            # Pull latest changes
            git pull origin main
            
            # Load environment variables
            set -a
            source .env
            set +a
            
            # Run migrations
            echo "🗄️  Running database migrations..."
            cd backend/deployments
            docker-compose --env-file ../.env run --rm migrate
            
            # Stop old container
            echo "⏹️  Stopping old containers..."
            docker-compose --env-file ../.env down
            
            # Pull latest image
            echo "📦 Pulling latest Docker image..."
            docker-compose --env-file ../.env pull
            
            # Start new container
            echo "🚀 Starting new container..."
            docker-compose --env-file ../.env up -d
            
            # Wait for service to be ready
            echo "⏳ Waiting for service..."
            sleep 5
            
            # Health check
            echo "✅ Checking service health..."
            docker-compose --env-file ../.env logs app | head -20
            
            echo "✨ Deployment complete!"
      
      # Step 3: Notify (optional)
      - name: Notify deployment success
        if: success()
        run: echo "✅ Deployed to production successfully"
      
      - name: Notify deployment failure
        if: failure()
        run: echo "❌ Deployment failed"
```

## Breaking Down the Deployment Script

### `set -e` - Exit on Error
```bash
set -e
```
If any command fails, stop executing. Prevents bad state.

### Pull Latest Code
```bash
cd ~/bakerio
git pull origin main
```
Gets the latest code from GitHub.

### Load Environment Variables
```bash
set -a
source .env
set +a
```
Loads variables from `.env` file so deployment script has them.

### Run Migrations
```bash
docker-compose run --rm migrate
```
Applies database schema changes before starting app.

### Stop Old Container
```bash
docker-compose down
```
Stops the running application.

### Pull Latest Image
```bash
docker-compose pull
```
Downloads the newly built Docker image from the registry.

### Start New Container
```bash
docker-compose up -d
```
Starts application with the new image.

### Health Check
```bash
docker-compose logs app | head -20
```
Displays first 20 lines of logs to verify it started correctly.

## What is appleboy/ssh-action?

It's a pre-built GitHub Action that:
- Connects to your server via SSH
- Runs shell commands
- Handles authentication with your SSH key

```yaml
with:
  host: ${{ secrets.DEPLOY_HOST }}        # Where to connect
  username: ${{ secrets.DEPLOY_USER }}    # SSH user
  key: ${{ secrets.DEPLOY_SSH_KEY }}      # Private key for auth
  port: ${{ secrets.DEPLOY_PORT }}        # SSH port
  script: |                               # Commands to run
    your commands here
```

## Manual Deployment

Even with auto-deploy, you can manually trigger:

1. GitHub repo → Actions tab
2. Select "Deploy to Production" workflow
3. Click "Run workflow"
4. Select branch (usually `main`)
5. Click "Run workflow"

This is useful if you need to deploy without pushing code.

## Deployment Checklist

Before your first deployment:

- [ ] Server has Docker installed
- [ ] SSH key generated and stored in GitHub
- [ ] Public key added to server's `~/.ssh/authorized_keys`
- [ ] `.env` file exists on server with all variables
- [ ] Project folder (`~/bakerio`) exists on server
- [ ] Docker registry credentials are set (if using private images)
- [ ] Secrets configured: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_PORT`

## Common Issues

### "Permission denied (publickey)"

**Cause**: SSH key isn't working

**Solution**:
1. Verify public key is on server: `cat ~/.ssh/authorized_keys`
2. Verify private key format is correct
3. Test locally: `ssh -i ~/.ssh/bakerio_deploy user@host`

### "docker-compose: command not found"

**Cause**: Docker Compose not installed on server

**Solution** (on server):
```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### ".env file not found"

**Cause**: Environment variables not on server

**Solution**:
Manually create `.env` file on server with all variables (database credentials, API keys, etc.)

### Migration fails during deployment

**Cause**: Migration has errors or database is dirty

**Solution**:
1. SSH into server
2. Check status: `docker-compose logs migrate`
3. Force fix: `docker exec bakerio-postgres psql -U user -d db -c "DELETE FROM schema_migrations WHERE version = 2"`
4. Retry deployment

### "Can't pull Docker image"

**Cause**: Image not found in registry, or auth failed

**Solution**:
1. Verify image was pushed successfully (check Docker Hub/GHCR)
2. Verify pull works locally
3. Add registry credentials to server

## Rollback Procedure

If something goes wrong:

```bash
# SSH into server
ssh user@host

# See previous versions
docker ps -a | grep bakerio

# Stop current version
docker-compose down

# Start previous version (if saved)
docker-compose up -d --pull=never
```

Or just push a new commit with a fix and deploy again.

## Monitoring Deployed Service

After deployment, check logs:

```bash
# From server
docker-compose logs -f app

# From GitHub Actions
# View deployment logs in Actions tab
```

## Advanced: Blue-Green Deployment

For zero-downtime deploys (advanced):

```bash
# Start new container on different port
docker-compose -f docker-compose.v2.yml up -d

# Run migrations on new version
docker-compose -f docker-compose.v2.yml run migrate

# Switch traffic (DNS or load balancer)
# Stop old container
docker-compose down
```

This requires two docker-compose files and a load balancer. See advanced docs if needed.

## Environment Variables for Deployment

Your `.env` on the server needs:
```
DB_USER=produser
DB_PASSWORD=strongpassword
DB_HOST=postgres
DB_PORT=5432
DB_NAME=bakerio_prod
JWT_SECRET=your-secret-key
PORT=8080
GIN_MODE=release
```

**Never** commit production secrets to GitHub. Store them in the `.env` file on the server only.
