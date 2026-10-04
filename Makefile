DEV_COMPOSE := docker compose -f docker-compose.yml --env-file .env.dev
PROD_COMPOSE := docker compose -f docker-compose.prod.yml --env-file .env.prod

.PHONY: help dev dev-up dev-down dev-clean dev-reset prod prod-up prod-down prod-ps prod-reset down clean reset secrets-decrypt secrets-status secrets-keygen secrets-edit-local secrets-edit-dev secrets-edit-prod secrets-edit-staging secrets-edit-extra

.DEFAULT_GOAL := help

help: ## Show this help menu
	@printf "\nUsage: make \033[36m<target>\033[0m\n"
	@awk ' \
		BEGIN {FS = ":.*?## "} \
		/^[a-zA-Z_-]+:.*?## / { \
			printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 \
		} \
		/^# ── / { \
			gsub(/^# ── | ──+$$/, ""); \
			printf "\n\033[1;35m%s\033[0m\n", $$0 \
		} \
	' $(MAKEFILE_LIST)
	@printf "\n"

# ── Development ──────────────────────────────────
dev: dev-up ## Start dev infra, migrate, and run application
	@echo "Waiting for Postgres..."
	$(DEV_COMPOSE) exec -T db pg_isready -U testing -t 10
	@echo "Running migrations..."
	pnpm prisma:deploy
	@echo "Starting dev server..."
	pnpm dev

dev-up: ## Start dev containers
	$(DEV_COMPOSE) up -d

dev-down: ## Stop dev containers
	$(DEV_COMPOSE) down

dev-clean: ## Stop dev containers and remove volumes
	$(DEV_COMPOSE) down -v

dev-reset: ## Hard reset dev environment
	$(DEV_COMPOSE) down -v
	$(MAKE) dev-up

# ── Production ───────────────────────────────────
prod: prod-up ## Build and start prod container stack natively

prod-up: ## Build and start prod container stack natively
	$(PROD_COMPOSE) up -d --build

prod-down: ## Stop prod containers
	$(PROD_COMPOSE) down

prod-ps: ## Status of prod containers
	$(PROD_COMPOSE) ps

prod-reset: ## Hard reset prod environment
	$(PROD_COMPOSE) down -v
	$(MAKE) prod-up

# ── Secrets (sops + age) ────────────────────────────
# Committed ciphertext in secrets/*.enc.* (see .sops.yaml) decrypts to the
# gitignored plaintext paths the app and compose files already consume.
# Requires the age key at ~/.config/sops/age/keys.txt - see documentation/secrets.md.
secrets-decrypt: ## Decrypt secrets into .env* + materialized blobs
	sops decrypt secrets/local.enc.env > .env
	sops decrypt secrets/dev.enc.env > .env.dev
	sops decrypt secrets/prod.enc.env > .env.prod
	sops decrypt secrets/staging.enc.env > .env.staging
	sops decrypt --extract '["release_bot_private_key"]' secrets/extra.enc.yaml > secrets/release-bot.pem
	chmod 600 secrets/release-bot.pem
	sops decrypt --extract '["google_oauth_client_json"]' secrets/extra.enc.yaml > secrets/google-secrets.json
	@echo "Decrypted: .env .env.dev .env.prod .env.staging secrets/release-bot.pem secrets/google-secrets.json"

secrets-status: ## Verify age key works and every ciphertext decrypts
	@test -f ~/.config/sops/age/keys.txt || (echo "Missing age key - run: make secrets-keygen" && exit 1)
	@for f in secrets/*.enc.env secrets/*.enc.yaml; do sops decrypt "$$f" > /dev/null && echo "OK: $$f"; done

secrets-keygen: ## Generate the shared age key (once per machine, kept out of git)
	@mkdir -p ~/.config/sops/age
	@test -f ~/.config/sops/age/keys.txt && echo "Key already exists at ~/.config/sops/age/keys.txt" || (age-keygen -o ~/.config/sops/age/keys.txt && chmod 600 ~/.config/sops/age/keys.txt)

secrets-edit-local: ## Edit local app secrets in place
	sops secrets/local.enc.env

secrets-edit-dev: ## Edit dev compose secrets in place
	sops secrets/dev.enc.env

secrets-edit-prod: ## Edit prod compose + app secrets in place
	sops secrets/prod.enc.env

secrets-edit-staging: ## Edit staging (Vercel) secrets in place
	sops secrets/staging.enc.env

secrets-edit-extra: ## Edit non-dotenv secrets (release key, OAuth JSON) in place
	sops secrets/extra.enc.yaml

# ── Global ───────────────────────────────────────
down: ## Stop all container environments
	$(DEV_COMPOSE) down
	$(PROD_COMPOSE) down

clean: ## Stop all environments and purge all volumes
	$(DEV_COMPOSE) down -v
	$(PROD_COMPOSE) down -v

reset: ## Hard reset everything (clean + rebuild + restart)
	$(MAKE) clean
	$(MAKE) dev-up
	$(MAKE) prod-up
