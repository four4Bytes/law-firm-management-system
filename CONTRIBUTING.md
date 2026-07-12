# Contributing

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Prerequisites

- Node.js 22+
- pnpm 11
- Docker + Docker Compose (for local Postgres & MinIO)

## Getting Started

1. **Clone the repo**

   ```bash
   git clone <url>
   cd law-firm-management-system
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Environment variables**

   Copy the example env files for your target environment:

   ```bash
   cp .env.dev.example .env.dev     # local development (make dev*)
   cp .env.prod.example .env.prod   # production stack (make prod*)
   ```

   `.env.dev` is used by `make dev*` targets, `.env.prod` by `make prod*` targets.
   The standalone `.env.example` serves as a combined reference for all variable descriptions.

   Fill in at minimum (for both):
   - `AUTH_SECRET` — generate with `pnpx auth secret`
   - `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — from [Google OAuth console](https://console.cloud.google.com/apis/credentials)
   - `DEVELOPER_EMAILS` — comma-separated email addresses that bypass Google OAuth in dev

4. **Start dev infrastructure** (Postgres + MinIO + auto-create S3 bucket)

   ```bash
   make dev-up
   ```

5. **Run database migrations**

   ```bash
   pnpm prisma:migrate
   ```

6. **Seed the database**

   ```bash
   pnpm prisma:seed
   ```

7. **Start the dev server**

   ```bash
   make dev
   ```

   Or step-by-step: `make dev-up` → `pnpm prisma:migrate` → `pnpm prisma:seed` → `pnpm dev`.

   Open [http://localhost:3000](http://localhost:3000).

## Make Targets (Infrastructure)

| Target                     | Description                             |
| -------------------------- | --------------------------------------- |
| `make dev` / `make dev-up` | Start dev containers (Postgres + MinIO) |
| `make dev-down`            | Stop dev containers                     |
| `make dev-clean`           | Stop dev containers and remove volumes  |
| `make dev-reset`           | Hard reset dev environment              |
| `make prod-up`             | Build and start production stack        |
| `make prod-down`           | Stop production containers              |
| `make prod-reset`          | Hard reset production environment       |
| `make down`                | Stop all container environments         |
| `make clean`               | Stop all environments and purge volumes |
| `make reset`               | Clean + rebuild + restart everything    |

## Available Commands

| Command                                                               | Description                                             |
| --------------------------------------------------------------------- | ------------------------------------------------------- |
| `pnpm dev`                                                            | Start the Next.js dev server                            |
| `pnpm build`                                                          | Generate Prisma client + production build               |
| `pnpm start`                                                          | Start the production server                             |
| `pnpm lint` / `pnpm lint:fix`                                         | ESLint with caching                                     |
| `pnpm format`                                                         | Prettier (with import sorting) + Prisma format          |
| `pnpm validate`                                                       | Format + lint + `tsc --noEmit`                          |
| `pnpm test` / `pnpm test:watch`                                       | Vitest (unit)                                           |
| `pnpm test:coverage`                                                  | Vitest with coverage                                    |
| `pnpm test:browser`                                                   | Vitest with Playwright                                  |
| `pnpm storybook` (port 6006) / `pnpm build-storybook`                 | Storybook                                               |
| `pnpm prisma:migrate` / `pnpm prisma:deploy` / `pnpm prisma:generate` | Prisma schema management                                |
| `pnpm prisma:seed`                                                    | Seed the database                                       |
| `pnpm prisma:studio`                                                  | Open Prisma Studio                                      |
| `pnpm prepare`                                                        | Husky + Prisma generate (runs automatically on install) |

## Development Workflow

After making changes, run the full validation pipeline:

```bash
pnpm validate && pnpm build
```

This checks formatting, lint, TypeScript types, and ensures the production build compiles.

Pre-commit hooks (Husky + lint-staged) auto-format and lint staged files. Pre-push hooks run `pnpm validate && pnpm test`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## Using AI/LLM Coding Agents

This project includes an [AGENTS.md](./AGENTS.md) file that documents the full set of conventions, architecture decisions, and coding standards. If you use AI coding tools (Cursor, Claude Code, opencode, etc.), provide [AGENTS.md](./AGENTS.md) to the agent so it understands the project's structure and rules.
