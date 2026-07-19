# Getting Started

## Prerequisites

- **Node.js** 22+
- **pnpm** 11
- **Docker** + **Docker Compose** (for local Postgres & MinIO)

## Setup

```bash
# 1. Clone the repository
git clone https://github.com/four4Bytes/law-firm-management-system.git
cd law-firm-management-system

# 2. Install dependencies
pnpm install

# 3. Copy environment files
cp .env.dev.example .env.dev       # local development (make dev*)
cp .env.prod.example .env.prod     # production stack (make prod*)

# 4. Start dev infrastructure (Postgres + MinIO)
make dev-up

# 5. Run database migrations
pnpm prisma:migrate

# 6. Seed the database
pnpm prisma:seed

# 7. Start the dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable               | Required | Description                                                                                         |
| ---------------------- | -------- | --------------------------------------------------------------------------------------------------- |
| `AUTH_SECRET`          | Yes      | Generate with `pnpm dlx auth secret`                                                                |
| `AUTH_GOOGLE_ID`       | Yes      | Google OAuth client ID                                                                              |
| `AUTH_GOOGLE_SECRET`   | Yes      | Google OAuth client secret                                                                          |
| `DEVELOPER_EMAILS`     | Yes      | Comma-separated emails that bypass Google OAuth in dev                                              |
| `APP_ORIGIN`           | Yes      | Public URL (e.g. `http://localhost:3000`)                                                           |
| `EMAIL_FROM`           | Yes      | Sender address for transactional emails                                                             |
| `MINIO_KMS_SECRET_KEY` | Yes      | Base64 key for MinIO SSE; see [Deployment - Storage Encryption](./deployment.md#storage-encryption) |

`.env.dev` is used by `make dev*` targets, `.env.prod` by `make prod*` targets. `.env.example` serves as a combined reference for all variable descriptions.

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
| `make dev-up`     | Start dev containers (Postgres + MinIO)                   |
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
