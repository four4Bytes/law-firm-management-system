# Getting Started

## Prerequisites

- **Node.js** 22+
- **pnpm** 11
- **Docker** + **Docker Compose** (for local Postgres, MinIO & Mailpit)

## Setup

```bash
# 1. Clone the repository
git clone https://github.com/four4Bytes/law-firm-management-system.git
cd law-firm-management-system

# 2. Install dependencies
pnpm install

# 3. Copy environment files
cp .env.example .env               # application runtime (Next.js, Prisma CLI, tests)
cp .env.dev.example .env.dev       # dev infrastructure (make dev*)

# 4. Start dev infrastructure (Postgres + MinIO + Mailpit)
make dev-up

# 5. Run database migrations
pnpm prisma:migrate

# 6. Seed the database
pnpm prisma:seed

# 7. Start the dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Mailpit (local email inbox) is available at [http://localhost:8025](http://localhost:8025).

## Environment Files

| File                                                      | Consumed by                                             | Contents                             |
| --------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------ |
| `.env`                                                    | Next.js dev server, Prisma CLI, seed script, Vitest     | Application runtime variables        |
| `.env.dev`                                                | `make dev-*` targets only (Docker Compose dev stack)    | Infrastructure-only variables        |
| `.env.prod`                                               | `make prod-*` targets (Docker Compose production stack) | Infrastructure **and** app variables |
| `.env.example` / `.env.dev.example` / `.env.prod.example` | — (templates to copy)                                   |                                      |

`.env.prod` is combined because in production the Next.js app runs inside a container and receives its runtime environment from that same file.

## Environment Variables (.env)

| Variable                          | Required | Description                                                                                           |
| --------------------------------- | -------- | ----------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                    | Yes      | Postgres connection string (`postgresql://testing:testing@localhost:5432/testing` for local dev)      |
| `AUTH_SECRET`                     | Yes      | NextAuth secret; generate with `openssl rand -hex 32`                                                 |
| `AUTH_GOOGLE_ID`                  | Yes      | Google OAuth client ID ([credentials console](https://console.cloud.google.com/apis/credentials))     |
| `AUTH_GOOGLE_SECRET`              | Yes      | Google OAuth client secret                                                                            |
| `DEVELOPER_EMAILS`                | Yes      | Comma-separated Google accounts allowed to sign in without being pre-registered (bootstrap Dev users) |
| `S3_ENDPOINT`                     | Yes      | S3-compatible endpoint (`http://localhost:9000` for local MinIO)                                      |
| `S3_REGION`                       | Yes      | Storage region (e.g. `us-east-1`)                                                                     |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | Yes      | Storage credentials (MinIO defaults: `minioadmin` / `minioadmin`)                                     |
| `S3_BUCKET`                       | Yes      | Bucket name for document storage (`law-firm-files`; created automatically by `make dev-up`)           |
| `S3_FORCE_PATH_STYLE`             | Yes      | Set `true` for MinIO/local endpoints                                                                  |
| `EMAIL_FROM`                      | Yes      | Sender address for transactional emails                                                               |
| `EMAIL_HOST` / `EMAIL_PORT`       | Yes      | SMTP host/port (Mailpit defaults: `localhost:1025`)                                                   |
| `EMAIL_USER` / `EMAIL_PASS`       | Yes      | SMTP credentials (Mailpit defaults: `mailpit` / `mailpit`)                                            |
| `EMAIL_SECURE`                    | Yes      | Use TLS for SMTP (`false` for local Mailpit)                                                          |
| `APP_ORIGIN`                      | Yes      | Public URL used to build absolute links (e.g. `http://localhost:3000`)                                |
| `CRON_SECRET`                     | Yes      | Authenticates cron job webhook requests; generate with `openssl rand -hex 32`                         |
| `DEFAULT_REMINDER_DAYS`           | No       | Days before due date to send reminders (default `3`)                                                  |
| `NOTIFICATION_RETENTION_DAYS`     | No       | Days before notifications are cleaned up (default `90`)                                               |
| `APP_TIMEZONE`                    | No       | IANA timezone for server-side date/time display (defaults to server's local timezone)                 |
| `STORAGE_GC_CRON_SCHEDULE`        | No       | node-cron schedule for the storage GC sweep (default weekly Sunday 03:00)                             |

### Infrastructure Variables (.env.dev)

| Variable                                              | Required | Description                                                                                                            |
| ----------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------- |
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | Yes      | Postgres container credentials (dev defaults: `testing`)                                                               |
| `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD`             | Yes      | MinIO container credentials (dev defaults: `minioadmin`)                                                               |
| `MINIO_KMS_SECRET_KEY`                                | No       | Base64 key for MinIO SSE encryption at rest; see [Deployment - Storage Encryption](./deployment.md#storage-encryption) |

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

### Make targets

| Target            | Description                                               |
| ----------------- | --------------------------------------------------------- |
| `make dev-up`     | Start dev containers (Postgres + MinIO + Mailpit)         |
| `make dev-down`   | Stop dev containers                                       |
| `make dev-clean`  | Stop dev containers and remove volumes                    |
| `make dev-reset`  | Down + up (hard reset dev environment)                    |
| `make dev`        | Start infra, wait for Postgres, migrate, start dev server |
| `make prod-up`    | Build and start production stack                          |
| `make prod-down`  | Stop production containers                                |
| `make prod-ps`    | Status of production containers                           |
| `make prod-reset` | Down + up (hard reset production environment)             |
| `make down`       | Stop all container environments                           |
| `make clean`      | Stop all environments and purge volumes                   |
| `make reset`      | Clean + rebuild + restart everything                      |

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
