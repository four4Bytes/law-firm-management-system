# Getting Started

## Prerequisites

- **Node.js** 22+
- **pnpm** 11
- **Docker** + **Docker Compose** (for local Postgres, SeaweedFS & Mailpit)
- **just** + **sops** + **age** (task runner and secret tooling)

> **Nix users (Linux, macOS, WSL):** you don't need to install any of the above manually -
> `flake.nix` + `flake.lock` pin them (Node 22, pnpm 11.10.0 via corepack, Prisma, Docker,
> just, sops, age).
>
> **Windows users:** this project expects you to work inside
> [WSL2](https://learn.microsoft.com/en-us/windows/wsl/install) (any distro) and follow
> the Nix path below. Native Windows (PowerShell/cmd) is not supported(idk) - every command
> in these docs (`just`, `sops`, `docker compose`, shell snippets) assumes a Unix shell.

## Reproducible dev environment with Nix

`flake.nix` provides a pinned shell (Node 22, pnpm 11.10.0 via corepack, Prisma, Docker, just, sops, age) for `x86_64-linux`, `aarch64-linux`, `aarch64-darwin` via `nixpkgs.lib.genAttrs` (`x86_64-darwin` dropped in nixpkgs 26.11). `flake.lock` makes it reproducible.

```bash
direnv allow          # via .envrc + nix-direnv - keeps your current shell/plugins (recommended)
# or
nix develop -c $SHELL # manual, without direnv; bare `nix develop` spawns bash
```

## Setup

```bash
# 1. Clone
git clone https://github.com/four4Bytes/law-firm-management-system.git
cd law-firm-management-system

# 2. Enter dev shell if using Nix (direnv keeps your shell; bare nix develop spawns bash)
direnv allow  # or: nix develop -c $SHELL

# 3. Install + env (inside the dev shell - provides just + sops + age)
pnpm install
just secrets-decrypt   # decrypts secrets/*.enc.* → .env* (needs the age key - see ./secrets.md)
# Without the age key: cp .env.example .env && cp .env.dev.example .env.dev

# 4. Start infra and DB
just dev-up
pnpm prisma:migrate
pnpm prisma:seed

# 5. Start dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Mailpit at [http://localhost:8025](http://localhost:8025). SeaweedFS filer (file browser) at [http://localhost:8888](http://localhost:8888).

## Environment Files

| File                                                      | Consumed by                                             | Contents                             |
| --------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------ |
| `.env`                                                    | Next.js dev server, Prisma CLI, seed script, Vitest     | Application runtime variables        |
| `.env.dev`                                                | `just dev-*` targets only (Docker Compose dev stack)    | Infrastructure-only variables        |
| `.env.prod`                                               | `just prod-*` targets (Docker Compose production stack) | Infrastructure **and** app variables |
| `.env.staging`                                            | Copy-paste source for the Vercel testing project        | Staging app variables (Neon + B2)    |
| `.env.example` / `.env.dev.example` / `.env.prod.example` | - (templates for key-less setup)                        |                                      |

The gitignored `.env*` files are materialized from committed sops ciphertext
(`secrets/*.enc.*`) via `just secrets-decrypt` - see [Secrets](./secrets.md).

`.env.prod` is combined because in production the Next.js app runs inside a container and receives its runtime environment from that same file.

## Environment Variables (.env)

| Variable                          | Required | Description                                                                                                         |
| --------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                    | Yes      | Postgres connection string (`postgresql://testing:testing@localhost:5432/testing` for local dev)                    |
| `AUTH_SECRET`                     | Yes      | NextAuth secret; generate with `openssl rand -hex 32`                                                               |
| `AUTH_GOOGLE_ID`                  | Yes      | Google OAuth client ID ([credentials console](https://console.cloud.google.com/apis/credentials))                   |
| `AUTH_GOOGLE_SECRET`              | Yes      | Google OAuth client secret                                                                                          |
| `DEVELOPER_EMAILS`                | Yes      | Comma-separated Google accounts allowed to sign in without being pre-registered (bootstrap Dev users)               |
| `S3_ENDPOINT`                     | Yes      | S3-compatible endpoint (`http://localhost:9000` for local SeaweedFS)                                                |
| `S3_REGION`                       | Yes      | Storage region (e.g. `us-east-1`)                                                                                   |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | Yes      | Storage credentials (local defaults: `s3admin` / `s3secret`)                                                        |
| `S3_BUCKET`                       | Yes      | Bucket name for document storage (`law-firm-files`; created automatically by `just dev-up`)                         |
| `S3_FORCE_PATH_STYLE`             | Yes      | Set `true` for SeaweedFS/local endpoints                                                                            |
| `EMAIL_FROM`                      | Yes      | Sender address for transactional emails                                                                             |
| `EMAIL_HOST` / `EMAIL_PORT`       | Yes      | SMTP host/port (Mailpit defaults: `localhost:1025`)                                                                 |
| `EMAIL_USER` / `EMAIL_PASS`       | Yes      | SMTP credentials (Mailpit defaults: `mailpit` / `mailpit`)                                                          |
| `EMAIL_SECURE`                    | Yes      | Use TLS for SMTP (`false` for local Mailpit)                                                                        |
| `APP_ORIGIN`                      | Yes      | Public URL used to build absolute links (e.g. `http://localhost:3000`)                                              |
| `CRON_SECRET`                     | Yes      | Authenticates cron job webhook requests; generate with `openssl rand -hex 32`                                       |
| `DEFAULT_REMINDER_DAYS`           | No       | Days before due date to send reminders (default `3`)                                                                |
| `NOTIFICATION_RETENTION_DAYS`     | No       | Days before notifications are cleaned up (default `90`)                                                             |
| `APP_TIMEZONE`                    | No       | IANA timezone for server-side date/time display (defaults to `Asia/Manila`; set to any IANA zone for worldwide use) |
| `STORAGE_GC_CRON_SCHEDULE`        | No       | node-cron schedule for the storage GC sweep (default weekly Sunday 03:00)                                           |

### Infrastructure Variables (.env.dev)

| Variable                                              | Required | Description                                                                                                      |
| ----------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------- |
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | Yes      | Postgres container credentials (dev defaults: `testing`)                                                         |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY`                     | Yes      | SeaweedFS S3 credentials (dev defaults: `s3admin` / `s3secret`)                                                  |
| `SEAWEEDFS_SSE_KEK`                                   | Yes      | 64-character hex SeaweedFS SSE-S3 KEK; see [Deployment - Storage Encryption](./deployment.md#storage-encryption) |

## Available Commands

### pnpm scripts

| Command                                                               | Description                               |
| --------------------------------------------------------------------- | ----------------------------------------- |
| `pnpm dev`                                                            | Start Next.js dev server                  |
| `pnpm build`                                                          | Generate Prisma client + production build |
| `pnpm start`                                                          | Start production server                   |
| `pnpm lint` / `pnpm lint:fix`                                         | ESLint with caching                       |
| `pnpm format`                                                         | Prettier + Prisma format                  |
| `pnpm validate`                                                       | Format + lint + `tsc --noEmit`            |
| `pnpm test` / `pnpm test:watch`                                       | Vitest unit tests                         |
| `pnpm test:coverage`                                                  | Vitest with coverage                      |
| `pnpm test:browser`                                                   | Vitest with Playwright                    |
| `pnpm storybook` / `pnpm build-storybook`                             | Storybook (port 6006)                     |
| `pnpm prisma:migrate` / `pnpm prisma:deploy` / `pnpm prisma:generate` | Prisma schema management                  |
| `pnpm prisma:seed`                                                    | Seed the database                         |
| `pnpm prisma:studio`                                                  | Open Prisma Studio                        |
| `pnpm prisma:reset`                                                   | Drop and recreate the database            |
| `pnpm prepare`                                                        | Husky + Prisma generate (runs on install) |

### just targets

`just --list` shows all targets grouped (Development / Production / Secrets / Global).
The `justfile` replaced the old `Makefile` 1:1 - `make` is gone, do not reintroduce it.

| Target            | Description                                               |
| ----------------- | --------------------------------------------------------- |
| `just dev-up`     | Start dev containers (Postgres + SeaweedFS + Mailpit)     |
| `just dev-down`   | Stop dev containers                                       |
| `just dev-clean`  | Stop dev containers and remove volumes                    |
| `just dev-reset`  | Down + up (hard reset dev environment)                    |
| `just dev`        | Start infra, wait for Postgres, migrate, start dev server |
| `just prod-up`    | Build and start production stack                          |
| `just prod-down`  | Stop production containers                                |
| `just prod-ps`    | Status of production containers                           |
| `just prod-reset` | Down + up (hard reset production environment)             |
| `just down`       | Stop all container environments                           |
| `just clean`      | Stop all environments and purge volumes                   |
| `just reset`      | Clean + rebuild + restart everything                      |

### Secrets targets (`sops` + `age` via `flake.nix`)

| Target                                             | Description                                              |
| -------------------------------------------------- | -------------------------------------------------------- |
| `just secrets-decrypt`                             | Decrypt `secrets/*.enc.*` → `.env*` + materialized blobs |
| `just secrets-status`                              | Verify the age key works and everything decrypts         |
| `just secrets-keygen`                              | Generate the shared age key (once per machine)           |
| `just secrets-edit-{local,dev,prod,staging,extra}` | Edit a ciphertext file in place with `sops`              |

Full guide: [Secrets](./secrets.md).

## Development Workflow

After making changes, run the full validation pipeline:

```bash
pnpm validate && pnpm build
```

This checks formatting, lint, TypeScript types, and ensures the production build compiles.

Pre-commit hooks (Husky + lint-staged) auto-format and lint staged files.
Pre-push hooks run `pnpm validate && pnpm test`.

## Using AI Coding Agents

This project includes an [AGENTS.md](../AGENTS.md) file that documents conventions, architecture decisions, and coding standards. If you use AI coding tools (Cursor, Claude Code, opencode, etc.), provide `AGENTS.md` to the agent so it understands the project's structure and rules.
