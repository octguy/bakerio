#!/usr/bin/env bash
# Bring up the full local stack.
#
# The frontends run in dev mode (`next dev`, see frontend/Dockerfile.local), so
# they fetch from the backend at REQUEST time, not at image-build time. That
# means a single `docker compose up --build` is enough — no need to start the
# backend first, no build-time prerender, and no attaching the image build to the
# docker network (the legacy-builder hack that broke on Docker 28).
#
# Steps:
#   1. Build + start everything (infra, backend, frontends).
#   2. Wait for the backend /health/ready endpoint.
#   3. Seed the demo catalog so the apps show real data.
set -euo pipefail

cd "$(dirname "$0")"

COMPOSE_FILE="docker-compose.local.yml"
NETWORK="bakerio_local"
DC=(docker compose -f "$COMPOSE_FILE")

echo "==> Step 1: building and starting the full stack"
"${DC[@]}" up -d --build

echo "==> Step 2: waiting for backend to become ready"
for i in $(seq 1 60); do
  if docker run --rm --network "$NETWORK" curlimages/curl:latest \
      -fsS "http://app:8080/health/ready" >/dev/null 2>&1; then
    echo "    backend ready."
    break
  fi
  if [ "$i" -eq 60 ]; then
    echo "    backend did not become ready in time. Recent app logs:" >&2
    "${DC[@]}" logs --tail 40 app >&2
    exit 1
  fi
  sleep 2
done

echo "==> Step 3: seeding demo catalog"
# Give the apps something real to render. The frontends fetch live at request
# time, so this only needs to run once the backend is up (no build dependency).
# Idempotent: the handler short-circuits when branches already exist.
SUPERADMIN_EMAIL="superadmin@bakerio.com"
SUPERADMIN_PASSWORD="123456"
LOGIN_BODY=$(printf '{"email":"%s","password":"%s"}' \
  "$SUPERADMIN_EMAIL" "$SUPERADMIN_PASSWORD")
LOGIN_RESPONSE=$(docker run --rm --network "$NETWORK" curlimages/curl:latest \
  -fsS -X POST "http://app:8080/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "$LOGIN_BODY")
# Extract access_token without depending on jq.
TOKEN=$(printf '%s' "$LOGIN_RESPONSE" | \
  sed -n 's/.*"access_token"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
if [ -z "$TOKEN" ]; then
  echo "    failed to obtain super_admin token; aborting." >&2
  echo "    login response: $LOGIN_RESPONSE" >&2
  exit 1
fi
SEED_RESPONSE=$(docker run --rm --network "$NETWORK" curlimages/curl:latest \
  -fsS -X POST "http://app:8080/api/v1/admin/seed-demo" \
  -H "Authorization: Bearer $TOKEN")
echo "    seed-demo response: $SEED_RESPONSE"

echo
echo "==> Stack is up:"
echo "    web (branding)  http://localhost:3001"
echo "    order           http://localhost:3002"
echo "    console         http://localhost:3003"
echo "    backend API     http://localhost:8080"
echo "    MailHog UI      http://localhost:8025"
echo "    MinIO console   http://localhost:9001  (minioadmin / minioadmin)"
echo "    RabbitMQ UI     http://localhost:15672 (guest / guest)"
echo
echo "    Frontends run in dev mode with hot reload — edits under frontend/"
echo "    are picked up live. First page load may take a moment to compile."
