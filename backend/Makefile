include .env

DB_URL=postgres://$(DB_USER):$(DB_PASSWORD)@$(DB_HOST):$(DB_PORT)/$(DB_NAME)?sslmode=$(DB_SSLMODE)
MIGRATIONS_PATH=db/migrations

# ============================================================
#  DATABASE MIGRATIONS
# ============================================================

# Run all pending migrations
#   make migrate-up
migrate-up:
	migrate -path $(MIGRATIONS_PATH) -database "$(DB_URL)" up

# Roll back the last migration
#   make migrate-down
migrate-down:
	migrate -path $(MIGRATIONS_PATH) -database "$(DB_URL)" down 1

# Roll back n migrations
#   make migrate-down-n n=2
migrate-down-n:
	migrate -path $(MIGRATIONS_PATH) -database "$(DB_URL)" down $(n)

# Drop all migrations and reapply (destructive — wipes data)
#   make reset-db
reset-db:
	migrate -path $(MIGRATIONS_PATH) -database "$(DB_URL)" down -all
	migrate -path $(MIGRATIONS_PATH) -database "$(DB_URL)" up

# Force set the migration version without running any migrations (fixes dirty state)
#   make migrate-force v=3
migrate-force:
	migrate -path $(MIGRATIONS_PATH) -database "$(DB_URL)" force $(v)

# Create a new sequential migration file pair (.up.sql / .down.sql)
#   make migrate-create name=create_orders_table
migrate-create:
	migrate create -ext sql -dir $(MIGRATIONS_PATH) -seq $(name)

# ============================================================
#  CODE GENERATION
# ============================================================

# Tidy go module dependencies
#   make tidy
tidy:
	go mod tidy

# Regenerate sqlc Go code from SQL queries and schema
#   make sqlc
sqlc:
	sqlc generate

# ============================================================
#  SERVER
# ============================================================

# Run the server locally
#   make run
run:
	go run ./cmd/server

# Compile-check the whole project without producing a binary.
# Useful as a quick "does it build?" gate before running.
#   make build
build:
	go build -o /dev/null ./...

# Regenerate Swagger docs from handler annotations.
#   make swagger
swagger:
	swag init -g cmd/server/main.go -o docs

# Stop the server (kills whatever listens on SERVER_PORT + the `go run` wrapper).
# `go run` spawns a compiled child binary; killing only the wrapper leaves it
# bound to the port, so we kill the port listener directly.
#   make stop
stop:
	@pids=$$(lsof -ti tcp:$(SERVER_PORT) 2>/dev/null); \
	if [ -z "$$pids" ]; then echo "no listener on port $(SERVER_PORT)"; else \
		kill $$pids 2>/dev/null; sleep 1; \
		alive=$$(lsof -ti tcp:$(SERVER_PORT) 2>/dev/null); \
		if [ -n "$$alive" ]; then kill -9 $$alive 2>/dev/null; fi; \
		echo "stopped listener on port $(SERVER_PORT)"; \
	fi
	@pkill -f "go run ./cmd/server" 2>/dev/null || true

# ============================================================
#  DOCKER
# ============================================================

# Start all containers in the background
#   make docker-up
docker-up:
	cd deployments && docker compose --env-file ../.env up -d

# Stop all containers
#   make docker-down
docker-down:
	cd deployments && docker compose --env-file ../.env down

# Stop all containers, remove volumes, then start fresh (destructive — wipes DB data)
#   make docker-reset
docker-reset:
	cd deployments && docker compose --env-file ../.env down -v && docker compose --env-file ../.env up -d --build

# Full nuclear reset — stop everything, wipe ALL volumes (DB / Redis / RabbitMQ /
# MinIO), rebuild every image with NO Docker cache, and bring everything back
# up. Use after big source changes or when you suspect a stale image.
# Slower than docker-reset (because of --no-cache) but guarantees a fresh build.
#   make docker-rebuild
docker-rebuild:
	cd deployments && docker compose --env-file ../.env down -v --remove-orphans
	cd deployments && docker compose --env-file ../.env build --no-cache
	cd deployments && docker compose --env-file ../.env up -d

# Rebuild and restart only the app container (keeps DB/Redis/RabbitMQ data)
#   make deploy
deploy:
	cd deployments && docker compose --env-file ../.env up -d --build app

# Tail logs from all containers
#   make docker-logs
docker-logs:
	cd deployments && docker compose --env-file ../.env logs -f

# Start mailhog
#	make docker-mail
docker-mail:
	cd deployments && docker compose --env-file ../.env up -d mailhog

# Start MinIO (object storage for product images)
#	make docker-minio
docker-minio:
	cd deployments && docker compose --env-file ../.env up -d minio

# Open an interactive psql shell inside the Postgres container.
# DB user / name come from .env (DB_USER, DB_NAME). Container name from
# deployments/docker-compose.yml (bakerio-postgres).
# Exit with \q or Ctrl-D.
#	make docker-psql
docker-psql:
	docker exec -it bakerio-postgres psql -U $(DB_USER) -d $(DB_NAME)

# Login as super_admin and trigger POST /admin/seed-demo so the dev DB has
# the full 10-branch / 80-product / 23-customer / 32-staff dataset.
# Idempotent on the server side: if any branch row exists, it's a no-op
# and the response says skipped=true.
#
# Override creds/host if needed:
#   make seed-demo SEED_EMAIL=other@x SEED_PASSWORD=xxx SEED_HOST=http://app:8080
#
#	make seed-demo
SEED_EMAIL    ?= superadmin@bakerio.com
SEED_PASSWORD ?= 123456
SEED_HOST     ?= http://localhost:$(SERVER_PORT)

seed-demo:
	@echo "▶ login as $(SEED_EMAIL)"
	@T=$$(curl -s -X POST $(SEED_HOST)/api/v1/auth/login \
		-H 'Content-Type: application/json' \
		-d '{"email":"$(SEED_EMAIL)","password":"$(SEED_PASSWORD)"}' \
		| python3 -c 'import sys,json;d=json.load(sys.stdin);print(d.get("data",{}).get("access_token") or "")'); \
	if [ -z "$$T" ]; then \
		echo "✗ login failed — is the server up on $(SEED_HOST)?"; exit 1; \
	fi; \
	echo "▶ POST $(SEED_HOST)/api/v1/admin/seed-demo"; \
	curl -s -X POST $(SEED_HOST)/api/v1/admin/seed-demo \
		-H "Authorization: Bearer $$T" \
		| python3 -m json.tool

# ─────────────────────────────────────────────────────────────────────────────
# k6 load / stress / race tests
#
# Both targets run the grafana/k6 container against `host.docker.internal:8080`
# by default — that matches `make run` on the host. Override BAKERIO_BASE_URL
# if the app is running inside compose.
#
#   make k6-load         multi-stage ramped stress load (K6_VUS, K6_DURATION, K6_P95_MS)
#   make k6-race         many VUs hammering one low-stock SKU
#                        (K6_VUS, K6_ITERATIONS, EXPECTED_STOCK, PRODUCT_NAME, BRANCH_NAME, QTY_PER_ORDER)
#   make k6-load-loop    run k6-load N times back-to-back (N=, default 3)
#   make k6-race-loop    run k6-race N times back-to-back (N=, default 3)
#
# K6_CUSTOMERS spreads VUs across N synthetic loaduser{N}@bakerio.com accounts
# instead of the 23 named ones — seed them first with SEED_LOAD_CUSTOMERS.
#
# Examples:
#   make k6-load K6_VUS=200 K6_DURATION=1m K6_CUSTOMERS=500
#   make k6-race K6_VUS=100 K6_ITERATIONS=300 EXPECTED_STOCK=20
#   make k6-load-loop N=5 K6_VUS=200
#
# race.js expects you to pin stock first; see the comment block at the top
# of tests/k6/race.js.
# ─────────────────────────────────────────────────────────────────────────────

K6_DC = cd deployments && docker compose --env-file ../.env --profile test run --rm

# How many times the *-loop targets repeat their inner run.
N ?= 3
# Per-(branch,product) stock the restock target refills to. A whole loop run
# drains inventory, so *-loop restocks to this between rounds to stay repeatable.
RESTOCK_QTY ?= 100000

# IMPORTANT: the scripts read LOAD_*/RACE_* env vars, NOT K6_VUS/K6_DURATION/
# K6_ITERATIONS. Those three are k6-reserved — passing them would make k6
# override the scripts' multi-stage / shared-iterations scenarios with a flat
# default one. We keep the friendly K6_* names as the user-facing knobs here and
# remap them to the LOAD_*/RACE_* names k6 won't touch.
k6-load:
	$(K6_DC) -e LOAD_VUS=$(K6_VUS) -e LOAD_DURATION=$(K6_DURATION) -e LOAD_P95_MS=$(K6_P95_MS) \
		-e LOAD_CUSTOMERS=$(K6_CUSTOMERS) \
		k6 run /scripts/load.js

k6-race:
	$(K6_DC) -e RACE_VUS=$(K6_VUS) -e RACE_ITERATIONS=$(K6_ITERATIONS) \
		-e EXPECTED_STOCK=$(EXPECTED_STOCK) \
		-e PRODUCT_NAME="$(PRODUCT_NAME)" -e BRANCH_NAME="$(BRANCH_NAME)" \
		-e QTY_PER_ORDER=$(QTY_PER_ORDER) -e LOAD_CUSTOMERS=$(K6_CUSTOMERS) \
		k6 run /scripts/race.js

# Refill every (branch,product) cell to RESTOCK_QTY so a repeated load run does
# not exhaust inventory mid-test (the catalog otherwise sells out after ~1 loop).
# Goes through the app's admin endpoint (login → POST /admin/restock) so it
# needs no psql on the host and works whether Postgres is local or in Docker.
k6-restock:
	@T=$$(curl -s -X POST $(SEED_HOST)/api/v1/auth/login \
		-H 'Content-Type: application/json' \
		-d '{"email":"$(SEED_EMAIL)","password":"$(SEED_PASSWORD)"}' \
		| python3 -c 'import sys,json;d=json.load(sys.stdin);print(d.get("data",{}).get("access_token") or "")'); \
	if [ -z "$$T" ]; then \
		echo "✗ restock login failed — is the server up on $(SEED_HOST)?"; exit 1; \
	fi; \
	echo "↻ restocking all branch_products to $(RESTOCK_QTY)…"; \
	curl -s -X POST "$(SEED_HOST)/api/v1/admin/restock?qty=$(RESTOCK_QTY)" \
		-H "Authorization: Bearer $$T" \
		| python3 -m json.tool

# set -e: if a round's restock fails, abort the loop instead of running a
# meaningless empty test against depleted stock.
k6-load-loop:
	@set -e; for i in $$(seq 1 $(N)); do \
		echo "──────── k6-load round $$i/$(N) ────────"; \
		$(MAKE) --no-print-directory k6-restock; \
		$(MAKE) --no-print-directory k6-load; \
	done

# No auto-restock here: race.js needs a manually PINNED low stock for the SKU
# under test. Re-pin that SKU between rounds yourself (see race.js header).
k6-race-loop:
	@for i in $$(seq 1 $(N)); do \
		echo "──────── k6-race round $$i/$(N) ────────"; \
		$(MAKE) --no-print-directory k6-race; \
	done