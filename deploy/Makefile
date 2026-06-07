# Bakerio — local development stack.
# Thin wrappers around docker-compose.local.yml and up-local.sh.
# Run from the deploy/ directory, e.g.  `make up`  /  `make logs s=order`.
.DEFAULT_GOAL := help

COMPOSE := docker compose -f docker-compose.local.yml
# Optional service selector for targets that can act on a single container,
# e.g. `make logs s=order`, `make sh s=app`, `make build s=console`.
s ?=

.PHONY: help up down clean restart stop start build rebuild logs ps health sh

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

up: ## Build + start everything, wait for backend, seed demo (runs ./up-local.sh)
	./up-local.sh

down: ## Stop and remove containers (keeps volumes / data)
	$(COMPOSE) down

clean: ## Stop and remove containers AND volumes (wipes DB, MinIO, etc.)
	$(COMPOSE) down -v

restart: ## Tear the stack down, then bring it back up
	$(MAKE) down
	$(MAKE) up

stop: ## Stop containers without removing them (all, or one with s=...)
	$(COMPOSE) stop $(s)

start: ## Start previously-stopped containers (all, or one with s=...)
	$(COMPOSE) start $(s)

build: ## Build images (all, or one with s=order)
	$(COMPOSE) build $(s)

rebuild: ## Rebuild images from scratch, no cache (all, or one with s=...)
	$(COMPOSE) build --no-cache $(s)

logs: ## Tail logs — all services, or one with `make logs s=order`
	$(COMPOSE) logs -f --tail=100 $(s)

ps: ## Show container status
	$(COMPOSE) ps

health: ## Check the backend readiness endpoint
	@curl -fsS http://localhost:8080/health/ready && echo " -> ready" || echo "backend not ready"

sh: ## Open a shell in a service: `make sh s=order`
	$(COMPOSE) exec $(s) sh
