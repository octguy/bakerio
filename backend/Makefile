include .env

DB_URL=postgres://$(DB_USER):$(DB_PASSWORD)@$(DB_HOST):$(DB_PORT)/$(DB_NAME)?sslmode=$(DB_SSLMODE)
MIGRATIONS_PATH=db/migrations

# MIGRATION
# migrate up all
migrate-up:
	migrate -path $(MIGRATIONS_PATH) -database "$(DB_URL)" up

# migrate down 1 step
migrate-down:
	migrate -path $(MIGRATIONS_PATH) -database "$(DB_URL)" down 1

# migrate down n steps
# usage: make migrate-down-n n=2
migrate-down-n:
	migrate -path $(MIGRATIONS_PATH) -database "$(DB_URL)" down $(n)

# reset database (drop all migrations then reapply)
reset-db:
	migrate -path $(MIGRATIONS_PATH) -database "$(DB_URL)" down -all
	migrate -path $(MIGRATIONS_PATH) -database "$(DB_URL)" up

# create new migration
# usage: make migrate-create name=create_users_table
migrate-create:
	migrate create -ext sql -dir $(MIGRATIONS_PATH) -seq $(name)

# TIDY
tidy:
	go mod tidy

# SQLC
sqlc:
	sqlc generate

# SERVER
run:
	go run ./cmd/server

# DOCKER
docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f

docker-clean:
	docker-compose down -v

docker-shell-postgres:
	docker-compose exec postgres psql -U $(DB_USER) -d $(DB_NAME)
