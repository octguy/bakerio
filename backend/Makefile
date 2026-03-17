include .env

DB_URL=postgres://$(DB_USER):$(DB_PASSWORD)@$(DB_HOST):$(DB_PORT)/$(DB_NAME)?sslmode=$(DB_SSLMODE)
MIGRATIONS_PATH=db/migrations

# List of all schemas — add new schemas here to include them in bulk commands
SCHEMAS=auth profile

# ============================================================
#  DATABASE MIGRATIONS
#  Bulk commands run across ALL schemas defined in SCHEMAS.
#  Schema commands target a single schema via schema=<name>.
# ============================================================

# Run all pending migrations for every schema
#   make migrate-up
migrate-up:
	@for schema in $(SCHEMAS); do \
		echo ">>> migrating $$schema"; \
		migrate -path $(MIGRATIONS_PATH)/$$schema -database "$(DB_URL)" up; \
	done

# Roll back the last migration for every schema
#   make migrate-down
migrate-down:
	@for schema in $(SCHEMAS); do \
		echo ">>> rolling back $$schema"; \
		migrate -path $(MIGRATIONS_PATH)/$$schema -database "$(DB_URL)" down 1; \
	done

# Roll back n migrations for every schema
#   make migrate-down-n n=2
migrate-down-n:
	@for schema in $(SCHEMAS); do \
		echo ">>> rolling back $$schema by $(n)"; \
		migrate -path $(MIGRATIONS_PATH)/$$schema -database "$(DB_URL)" down $(n); \
	done

# Drop all migrations and reapply for every schema (destructive — wipes data)
#   make reset-db
reset-db:
	@for schema in $(SCHEMAS); do \
		echo ">>> resetting $$schema"; \
		migrate -path $(MIGRATIONS_PATH)/$$schema -database "$(DB_URL)" down -all; \
		migrate -path $(MIGRATIONS_PATH)/$$schema -database "$(DB_URL)" up; \
	done

# ============================================================
#  SINGLE SCHEMA MIGRATION COMMANDS
#  All commands below require: schema=<name>
# ============================================================

# Run all pending migrations for a specific schema
#   make migrate-schema-up schema=auth
migrate-schema-up:
	migrate -path $(MIGRATIONS_PATH)/$(schema) -database "$(DB_URL)" up

# Roll back the last migration for a specific schema
#   make migrate-schema-down schema=auth
migrate-schema-down:
	migrate -path $(MIGRATIONS_PATH)/$(schema) -database "$(DB_URL)" down 1

# Roll back n migrations for a specific schema
#   make migrate-schema-down-n schema=auth n=2
migrate-schema-down-n:
	migrate -path $(MIGRATIONS_PATH)/$(schema) -database "$(DB_URL)" down $(n)

# Drop all migrations and reapply for a specific schema (destructive — wipes data)
#   make migrate-schema-reset schema=auth
migrate-schema-reset:
	migrate -path $(MIGRATIONS_PATH)/$(schema) -database "$(DB_URL)" down -all
	migrate -path $(MIGRATIONS_PATH)/$(schema) -database "$(DB_URL)" up

# Create a new sequential migration file pair (.up.sql / .down.sql)
#   make migrate-create schema=auth name=create_users_table
migrate-create:
	migrate create -ext sql -dir $(MIGRATIONS_PATH)/$(schema) -seq $(name)

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
	cd deployments && docker-compose --env-file ../.env up -d

# Stop all containers
#   make docker-down
docker-down:
	cd deployments && docker-compose --env-file ../.env down

# Stop all containers, remove volumes, then start fresh (destructive — wipes DB data)
#   make docker-reset
docker-reset:
	cd deployments && docker-compose --env-file ../.env down -v && docker-compose --env-file ../.env up -d

# Tail logs from all containers
#   make docker-logs
docker-logs:
	cd deployments && docker-compose --env-file ../.env logs -f
