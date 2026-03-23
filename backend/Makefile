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

# Tail logs from all containers
#   make docker-logs
docker-logs:
	cd deployments && docker compose --env-file ../.env logs -f
