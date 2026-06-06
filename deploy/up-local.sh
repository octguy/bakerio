#!/usr/bin/env bash
# Bring up the full local stack with production fidelity: mocks are disabled and
# the frontend apps prerender against a LIVE backend during their image build,
# exactly like CI builds against the deployed API.
#
# Why a script instead of plain `docker compose up --build`:
#   `compose up --build` builds every image up front, before any service starts.
#   The order/console apps prerender pages by fetching the catalog at build time
#   (NEXT_PUBLIC_DISABLE_MOCK_FALLBACK=true means a failed fetch aborts the build
#   instead of baking mocks). So the backend must already be running and healthy
#   on the compose network before the frontends are built.
#
# Phases:
#   1. Build + start infra and the backend (postgres, redis, rabbitmq, minio,
#      mailhog, migrate, app).
#   2. Wait for the backend /health/ready endpoint.
#   3. Build the frontends attached to the live compose network so their
#      build-time fetch to http://app:8080 succeeds.
#   4. Start the frontends.
set -euo pipefail

cd "$(dirname "$0")"

COMPOSE_FILE="docker-compose.local.yml"
NETWORK="bakerio_local"
DC=(docker compose -f "$COMPOSE_FILE")

echo "==> Phase 1: building and starting backend + infra"
"${DC[@]}" up -d --build postgres redis rabbitmq minio mailhog app

echo "==> Phase 2: waiting for backend to become ready"
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

echo "==> Phase 3: building frontends against the live API (--network $NETWORK)"
# Each frontend service sets `build.network: bakerio_local` in compose so the
# build container joins the live network and can resolve `app:8080` during
# Next.js prerender. BuildKit refuses named docker networks (it only accepts
# host/none or a builder configured via `buildx create --driver-opt network=`),
# so use the legacy builder for this phase. The backend image in Phase 1 still
# builds with BuildKit via the default env.
COMPOSE_DOCKER_CLI_BUILD=0 DOCKER_BUILDKIT=0 \
  "${DC[@]}" build web order console

echo "==> Phase 4: starting frontends"
"${DC[@]}" up -d web order console

echo
echo "==> Stack is up:"
echo "    web (branding)  http://localhost:3001"
echo "    order           http://localhost:3002"
echo "    console         http://localhost:3003"
echo "    backend API     http://localhost:8080"
echo "    MailHog UI      http://localhost:8025"
echo "    MinIO console   http://localhost:9001  (minioadmin / minioadmin)"
echo "    RabbitMQ UI     http://localhost:15672 (guest / guest)"
