# Workflow: Code Linting & Quality Checks

## What This Does

Checks your code for:
- Style violations (inconsistent formatting)
- Potential bugs (unused variables, unreachable code)
- Security issues
- Best practice violations

## When It Runs

- On every push to `main` or `develop` branches
- On every pull request to `main`

## Complete Workflow File

Create `.github/workflows/lint.yml`:

```yaml
name: Lint & Code Quality

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  lint:
    runs-on: ubuntu-latest
    
    steps:
      # Step 1: Checkout code
      - uses: actions/checkout@v3
      
      # Step 2: Set up Go
      - uses: actions/setup-go@v4
        with:
          go-version: '1.26.1'
      
      # Step 3: Run golangci-lint
      - uses: golangci/golangci-lint-action@v3
        with:
          version: latest
          working-directory: backend
          args: >-
            --timeout=5m
            --enable=gofmt
            --enable=vet
            --enable=errcheck
            --enable=staticcheck
      
      # Step 4: Check code formatting (gofmt)
      - run: |
          cd backend
          if ! gofmt -l . | grep -q .; then
            echo "✓ Code is properly formatted"
          else
            echo "✗ Run 'gofmt -w .' to format code"
            gofmt -l .
            exit 1
          fi
      
      # Step 5: Vet for common mistakes
      - run: cd backend && go vet ./...
```

## What is golangci-lint?

It's a linter aggregator - combines multiple Go linters into one tool:

- **gofmt**: Checks code formatting
- **vet**: Detects likely mistakes
- **errcheck**: Ensures errors are handled
- **staticcheck**: Finds bugs before runtime
- **misspell**: Catches typos

## What is gofmt?

Formats Go code according to standard (like Prettier for JavaScript).

### Fix formatting locally

```bash
cd backend
gofmt -w .  # Fix all files
```

## What is go vet?

Detects suspicious code patterns:
- Unused variables
- Unreachable code
- Type mismatches
- SQL injection risks

### Run locally

```bash
cd backend
go vet ./...
```

## Enabled Checks

| Check | Purpose |
|-------|---------|
| `gofmt` | Consistent formatting |
| `vet` | Suspicious code patterns |
| `errcheck` | Missing error handling |
| `staticcheck` | Common bugs |

To add more checks, add them to the `--enable` list:

```yaml
--enable=revive          # Additional style checks
--enable=gosec           # Security issues
--enable=ineffassign     # Ineffectual assignments
```

(Remove the `?` - comment explains what each does, but is not valid YAML)

## Common Issues

### "gofmt needs running"

Your code formatting doesn't match Go standards.

**Fix locally**:
```bash
cd backend && gofmt -w .
```

Then commit and push again.

### "go vet found issues"

Something syntactically weird in your code.

**Solution**: Read the error and fix it. It's usually:
- Using a variable that's not initialized
- Type mismatch
- Unreachable code

Example error:
```
example.go:10:2: no new variables on left side of :=
```
Fix: Use `=` instead of `:=` if variable already exists.

### golangci-lint timeout

Increase timeout in workflow:
```yaml
args: >-
  --timeout=10m
```

## Before Pushing Code

Run these locally:

```bash
cd backend

# Format code
gofmt -w .

# Run linter
golangci-lint run ./...

# Run vet
go vet ./...
```

This prevents failed checks in GitHub Actions.

## Making Linting Mandatory

In GitHub repo settings:
1. Settings → Branches → main
2. Add status check: "Lint & Code Quality" must pass

This prevents code with poor style/quality from reaching main.

## Custom golangci-lint Config

Create `.golangci.yml` in the backend root for custom rules:

```yaml
linters:
  enable:
    - gofmt
    - vet
    - errcheck
    - staticcheck
  disable:
    - lll  # Line length limit (annoying)

linters-settings:
  misspell:
    locale: US
```

Then update workflow to use it:
```yaml
- uses: golangci/golangci-lint-action@v3
  with:
    version: latest
    working-directory: backend
```

The workflow will automatically find and use `.golangci.yml`.
