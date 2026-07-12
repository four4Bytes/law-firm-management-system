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

## Release Workflow

The project uses **CalVer** (Calendar Versioning) with automatic tagging on every merge to `main`.

### Branching Flow

```
dev  ──(work)──→ dev ──(PR)──→ main ──(merge)──→ auto-tag + GitHub Release
```

1. Work is committed to `dev` (or feature branches).
2. When ready, open a pull request from `dev` → `main`.
3. On merge to `main`, CI runs (`build` → `validate` → `test`).
4. If CI passes, a **CalVer tag** is created (e.g., `v2026.07.12.0`) and a **GitHub Release** is published with auto-generated release notes.

### Version Format

```
v{YYYY}.{MM}.{PATCH}
```

- `YYYY` — 4-digit year
- `MM` — 2-digit month
- `PATCH` — zero-based increment for the day (resets monthly)

Examples: `v2026.07.12.0`, `v2026.07.12.1`, `v2026.08.01.0`

### The Version in the App

The current version is displayed at the bottom of the sidebar.

| Context                        | Value                              |
| ------------------------------ | ---------------------------------- |
| CI release build               | CalVer tag (e.g., `v2026.07.12.0`) |
| Local dev                      | `0.0.0-dev`                        |
| Docker build without build arg | `0.0.0-dev`                        |

To override locally:

```bash
NEXT_PUBLIC_APP_VERSION=my-feature-branch pnpm dev
```

### Cutting a Release

```bash
# 1. Ensure dev is up to date and clean
git checkout dev && git pull

# 2. Merge into main
git checkout main && git merge dev
git push origin main    # triggers CI + auto-release

# 3. Verify the release on GitHub
#    https://github.com/your-org/your-repo/releases
```

### Manual Trigger

The release can also be triggered manually from the GitHub Actions tab:

1. Navigate to **Actions** → **Continuous Integration**
2. Click **Run workflow**
3. Select branch `main` and run

### Docker Production Build

When building the production Docker image manually, pass the version as a build arg:

```bash
docker build --build-arg NEXT_PUBLIC_APP_VERSION="$(git describe --tags --always)" -t law-firm:latest .
```

With the production Compose stack, uncomment the `args` section in `docker-compose.prod.yml`:

```yaml
web:
  build:
    context: .
    args:
      NEXT_PUBLIC_APP_VERSION: "${NEXT_PUBLIC_APP_VERSION:-0.0.0-dev}"
```

Then set the version in `.env.prod`:

```
NEXT_PUBLIC_APP_VERSION=v2026.07.12.0
```

## Tech Stack

- [Next.js 16 (App Router)](https://nextjs.org/docs) — React framework with file-based routing and server components.
- [React 19](https://react.dev) — UI library, with React Compiler for automatic memoization.
- [TypeScript](https://www.typescriptlang.org/docs) — strict-mode typed JavaScript.
- [pnpm](https://pnpm.io/motivation) — fast, disk-efficient package manager.
- [PostgreSQL](https://www.postgresql.org/docs) — relational database.
- [Prisma 7](https://www.prisma.io/docs) — ORM with `@prisma/adapter-pg` driver and Prisma Studio.
- [NextAuth v5](https://next-auth.js.org/getting-started/introduction) — authentication (JWT sessions, Google OAuth, Prisma adapter).
- [AWS SDK v3 (S3)](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3) — object storage via presigned URLs; [MinIO](https://min.io/docs/minio/container/index.html) for local dev.
- [react-aria-components](https://react-spectrum.adobe.com/react-aria/index.html) — accessible headless UI primitives.
- [react-icons](https://react-icons.github.io/react-icons) — icon library.
- [CSS Modules](https://nextjs.org/docs/app/building-your-application/styling/css-modules) — scoped styles; [clsx](https://github.com/lukeed/clsx) for composition.
- [Zod](https://zod.dev) — schema validation.
- [ESLint](https://eslint.org/docs/latest) (flat config) + [Prettier](https://prettier.io/docs) — linting and formatting.
- [Husky](https://typicode.github.io/husky) + [lint-staged](https://github.com/lint-staged/lint-staged) — pre-commit hooks.
- [Vitest](https://vitest.dev/guide) + [Playwright](https://playwright.dev/docs/intro) — unit and browser testing.
- [Storybook](https://storybook.js.org/docs) — component development environment.
- [Docker](https://docs.docker.com) + [Docker Compose](https://docs.docker.com/compose) — containerized dev and production environments.
- [GitHub Actions](https://docs.github.com/actions) — CI/CD; [Dependabot](https://docs.github.com/code-security/dependabot) — dependency updates.

## Using AI/LLM Coding Agents

This project includes an [AGENTS.md](./AGENTS.md) file that documents the full set of conventions, architecture decisions, and coding standards. If you use AI coding tools (Cursor, Claude Code, opencode, etc.), provide [AGENTS.md](./AGENTS.md) to the agent so it understands the project's structure and rules.
