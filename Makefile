.PHONY: dev dev-up dev-down dev-reset prod prod-up prod-down prod-build \
        prod-ps prod-reset down clean reset help

DEV_COMPOSE := docker compose --env-file .env.dev
PROD_COMPOSE := docker compose --env-file .env.prod

# ── Dev ──────────────────────────────────────────
dev-up:          ## Start dev infra (db + minio)
	$(DEV_COMPOSE) up -d

dev-down:        ## Stop dev infra
	$(DEV_COMPOSE) down

dev-reset:       ## Wipe dev volumes + restart fresh
	$(DEV_COMPOSE) down -v
	$(DEV_COMPOSE) up -d

dev: dev-up      ## Infra → migrate → dev server (Ctrl+C to stop server, infra keeps running)
	@echo "Waiting for Postgres..."
	@until $(DEV_COMPOSE) exec -T db pg_isready -U testing 2>/dev/null; do sleep 1; done
	@echo "Running migrations..."
	pnpm prisma:deploy
	@echo "Starting dev server..."
	pnpm dev

# ── Prod ─────────────────────────────────────────
prod-build:      ## Build prod images
	$(PROD_COMPOSE) build

prod-up:         ## Start prod stack
	$(PROD_COMPOSE) up -d

prod: prod-build prod-up  ## Build + start prod

prod-down:       ## Stop prod stack
	$(PROD_COMPOSE) down

prod-ps:         ## Show prod container status
	$(PROD_COMPOSE) ps

prod-reset:      ## Wipe prod volumes + rebuild + restart
	$(PROD_COMPOSE) down -v
	$(PROD_COMPOSE) build
	$(PROD_COMPOSE) up -d

# ── Docker Cleanup ───────────────────────────────
down:            ## Stop all environments
	$(DEV_COMPOSE) down
	$(PROD_COMPOSE) down

clean: down      ## Stop + remove all volumes (dev + prod)
	$(DEV_COMPOSE) down -v
	$(PROD_COMPOSE) down -v

reset: clean     ## Wipe everything + rebuild prod + restart dev+prod
	$(DEV_COMPOSE) up -d
	$(PROD_COMPOSE) build
	$(PROD_COMPOSE) up -d

# ── Help ─────────────────────────────────────────
help:            ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*##' $(MAKEFILE_LIST) \
	  | sort \
	  | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
