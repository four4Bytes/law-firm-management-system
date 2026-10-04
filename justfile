# Task runner for the law-firm-management-system (replaces the removed Makefile).
# Requires just + sops + age, provided by flake.nix (Linux, macOS, WSL).
# Windows users: use WSL - native Windows is not supported.

dev_compose := "docker compose -f docker-compose.yml --env-file .env.dev"
prod_compose := "docker compose -f docker-compose.prod.yml --env-file .env.prod"

default: help

# Show available tasks.
help:
    @just --list

# ── Development ──────────────────────────────────

# Start dev infra, migrate, and run application.
[group('Development')]
dev: dev-up
    @echo "Waiting for Postgres..."
    {{ dev_compose }} exec -T db pg_isready -U testing -t 10
    @echo "Running migrations..."
    pnpm prisma:deploy
    @echo "Starting dev server..."
    pnpm dev

# Start dev containers.
[group('Development')]
dev-up:
    {{ dev_compose }} up -d

# Stop dev containers.
[group('Development')]
dev-down:
    {{ dev_compose }} down

# Stop dev containers and remove volumes.
[group('Development')]
dev-clean:
    {{ dev_compose }} down -v

# Hard reset dev environment.
[group('Development')]
dev-reset:
    {{ dev_compose }} down -v
    just dev-up

# ── Production ───────────────────────────────────

# Build and start prod container stack natively.
[group('Production')]
prod: prod-up

# Build and start prod container stack natively.
[group('Production')]
prod-up:
    {{ prod_compose }} up -d --build

# Stop prod containers.
[group('Production')]
prod-down:
    {{ prod_compose }} down

# Status of prod containers.
[group('Production')]
prod-ps:
    {{ prod_compose }} ps

# Hard reset prod environment.
[group('Production')]
prod-reset:
    {{ prod_compose }} down -v
    just prod-up

# ── Secrets (sops + age) ────────────────────────────
# Committed ciphertext in secrets/*.enc.* (see .sops.yaml) decrypts to the
# gitignored plaintext paths the app and compose files already consume.
# Age key lives at ~/.config/sops/age/keys.txt - see documentation/secrets.md.

# Decrypt secrets into .env* + materialized blobs.
[group('Secrets')]
secrets-decrypt:
    sops decrypt --output .env secrets/local.enc.env
    sops decrypt --output .env.dev secrets/dev.enc.env
    sops decrypt --output .env.prod secrets/prod.enc.env
    sops decrypt --output .env.staging secrets/staging.enc.env
    sops decrypt --extract '["release_bot_private_key"]' --output secrets/release-bot.pem secrets/extra.enc.yaml
    sops decrypt --extract '["google_oauth_client_json"]' --output secrets/google-secrets.json secrets/extra.enc.yaml
    @echo "Decrypted: .env .env.dev .env.prod .env.staging secrets/release-bot.pem secrets/google-secrets.json"

# Verify age key works and every ciphertext decrypts.
[group('Secrets')]
secrets-status:
    test -f ~/.config/sops/age/keys.txt || (echo "Missing age key - run: just secrets-keygen" && exit 1)
    for f in secrets/*.enc.env secrets/*.enc.yaml; do sops decrypt "$f" > /dev/null && echo "OK: $f"; done

# Generate the shared age key (once per machine, kept out of git).
[group('Secrets')]
secrets-keygen:
    mkdir -p ~/.config/sops/age
    test -f ~/.config/sops/age/keys.txt && echo "Key already exists at ~/.config/sops/age/keys.txt" || (age-keygen -o ~/.config/sops/age/keys.txt && chmod 600 ~/.config/sops/age/keys.txt)

# Edit local app secrets in place.
[group('Secrets')]
secrets-edit-local:
    sops secrets/local.enc.env

# Edit dev compose secrets in place.
[group('Secrets')]
secrets-edit-dev:
    sops secrets/dev.enc.env

# Edit prod compose + app secrets in place.
[group('Secrets')]
secrets-edit-prod:
    sops secrets/prod.enc.env

# Edit staging (Vercel) secrets in place.
[group('Secrets')]
secrets-edit-staging:
    sops secrets/staging.enc.env

# Edit non-dotenv secrets (release key, OAuth JSON) in place.
[group('Secrets')]
secrets-edit-extra:
    sops secrets/extra.enc.yaml

# ── Global ───────────────────────────────────────

# Stop all container environments.
[group('Global')]
down: dev-down prod-down

# Stop all environments and purge all volumes.
[group('Global')]
clean:
    {{ dev_compose }} down -v
    {{ prod_compose }} down -v

# Hard reset everything (clean + rebuild + restart).
[group('Global')]
reset: clean
    just dev-up
    just prod-up
