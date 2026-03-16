# Workflow: Build Docker Image

## What This Does

Builds your Docker image and optionally pushes it to a registry (Docker Hub, GitHub Container Registry, etc.)

## When It Runs

- On every push to `main` branch (build & push)
- On every pull request (build only, don't push)

## Complete Workflow File

Create `.github/workflows/build.yml`:

```yaml
name: Build Docker Image

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    
    permissions:
      contents: read
      packages: write  # For GitHub Container Registry
    
    steps:
      # Step 1: Checkout code
      - uses: actions/checkout@v3
      
      # Step 2: Set up Docker Buildx
      - uses: docker/setup-buildx-action@v2
      
      # Step 3: Log in to Docker Hub (if pushing)
      - uses: docker/login-action@v2
        if: github.event_name == 'push'
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}
      
      # Step 4: Build and push Docker image
      - uses: docker/build-push-action@v4
        with:
          context: ./backend
          dockerfile: ./backend/Dockerfile
          push: ${{ github.event_name == 'push' }}
          tags: |
            yourusername/bakerio:latest
            yourusername/bakerio:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

## What Each Step Does

| Step | Purpose |
|------|---------|
| **Checkout** | Get your code |
| **Setup Buildx** | Enable advanced Docker build features |
| **Docker Login** | Authenticate to push images |
| **Build & Push** | Create image and upload to registry |

## Understanding the Build Step

```yaml
- uses: docker/build-push-action@v4
  with:
    context: ./backend              # Location of code to build
    dockerfile: ./backend/Dockerfile # Path to Dockerfile
    push: ${{ github.event_name == 'push' }}  # Only push on 'push' events
    tags: |
      yourusername/bakerio:latest
      yourusername/bakerio:${{ github.sha }}
```

### What are tags?

Tags are version labels for your Docker image:

- `yourusername/bakerio:latest` - The most recent version
- `yourusername/bakerio:abc123def` - Specific commit (SHA)

### When 'latest' is used

```
docker pull yourusername/bakerio:latest  # Gets the newest build
```

### When commit SHA is used

```
docker pull yourusername/bakerio:abc123  # Gets specific version
```

## Using GitHub Container Registry

If you prefer GitHub's registry instead of Docker Hub:

```yaml
- uses: docker/login-action@v2
  if: github.event_name == 'push'
  with:
    registry: ghcr.io
    username: ${{ github.actor }}
    password: ${{ secrets.GITHUB_TOKEN }}

- uses: docker/build-push-action@v4
  with:
    context: ./backend
    dockerfile: ./backend/Dockerfile
    push: ${{ github.event_name == 'push' }}
    tags: |
      ghcr.io/${{ github.repository }}:latest
      ghcr.io/${{ github.repository }}:${{ github.sha }}
```

**Advantage**: No need to set up extra secrets, uses GitHub's built-in auth.

## Setting Up Docker Hub Secrets

To use Docker Hub, add secrets to GitHub:

1. Go to GitHub repo → Settings → Secrets and variables → Actions
2. Create `DOCKERHUB_USERNAME`:
   - Get your Docker Hub username from `docker login`
3. Create `DOCKERHUB_TOKEN`:
   - Create a Personal Access Token in Docker Hub
   - Account Settings → Security → New Access Token
   - Select "Read, write, and delete" permissions
   - Copy the token

Then in workflow:
```yaml
username: ${{ secrets.DOCKERHUB_USERNAME }}
password: ${{ secrets.DOCKERHUB_TOKEN }}
```

## Build vs Build & Push

### Pull Request (build only)

```yaml
if: github.event_name == 'push'
```

On PRs: This condition is `false`, so it only builds without pushing.

**Purpose**: Verify the Dockerfile compiles correctly before merging.

### Push to main (build & push)

When you merge to main, it automatically:
1. Builds the image
2. Tags it with commit SHA and 'latest'
3. Pushes to Docker Hub/GHCR

## Caching Layer Explained

```yaml
cache-from: type=gha
cache-to: type=gha,mode=max
```

GitHub Actions cache layers from previous builds, making rebuilds faster.

**Example**:
- First build: 2 minutes (builds all layers)
- Next build: 30 seconds (reuses cached layers like `FROM golang:1.26.1`)

This saves time and bandwidth.

## Common Issues

### "auth error unauthorized"

Your Docker Hub credentials are wrong.

**Solution**:
1. Verify `DOCKERHUB_TOKEN` is correct (not your password)
2. Check username is set in `DOCKERHUB_USERNAME`
3. Make sure token has "read, write, delete" permissions

### "Build fails but works locally"

The runner environment is different.

**Debug**:
```bash
# Build exactly like GitHub Actions
docker build -f backend/Dockerfile ./backend

# If it fails here, fix your Dockerfile
# Run Dockerfile locally to test
```

### Image size is huge

Your Docker image is too large.

**Solution**: See [Dockerfile optimization guide](#dockerfile-optimization)

## Viewing Built Images

After a successful build, images appear in:

### Docker Hub
```
docker pull yourusername/bakerio:latest
```

### GitHub Container Registry
```
docker pull ghcr.io/yourusername/bakerio:latest
```

## Using the Built Image

Once pushed, use it anywhere:

```bash
# Local machine
docker run yourusername/bakerio:latest

# Docker Compose
services:
  app:
    image: yourusername/bakerio:latest
```

## Dockerfile Optimization

Keep your Dockerfile small and fast:

### Bad (large image)
```dockerfile
FROM golang:1.26.1  # Includes build tools (500MB+)
WORKDIR /app
COPY . .
RUN go build -o server ./cmd/server
CMD ["./server"]
```

### Good (multi-stage build)
```dockerfile
FROM golang:1.26.1 AS builder
WORKDIR /app
COPY . .
RUN go build -o server ./cmd/server

FROM alpine:latest  # Tiny base (5MB)
COPY --from=builder /app/server .
CMD ["./server"]
```

Your project already uses multi-stage! It's optimized.
