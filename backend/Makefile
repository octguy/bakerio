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

# Start backend containers, run migrations, and seed the database for E2E tests
test-setup:
	cd deployments && docker compose --env-file ../.env up -d
	@echo "Waiting for PostgreSQL container to be healthy..."
	@until docker exec bakerio-postgres pg_isready -U postgres -d bakerio-db >/dev/null 2>&1; do sleep 1; done
	docker exec -i bakerio-postgres psql -U postgres -d bakerio-db < ../db/seed_e2e.sql
