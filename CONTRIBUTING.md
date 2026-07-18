# Contributing

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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

## Prerequisites

- Node.js 22+
- pnpm 11
- Docker + Docker Compose (for local Postgres & MinIO)

## Getting Started

1. **Clone the repo**

   ```bash
   git clone https://github.com/four4Bytes/law-firm-management-system.git
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
   - `APP_ORIGIN` — the public URL of the app (e.g. `http://localhost:3000` for local dev). Used to build absolute links in email notifications.
   - `EMAIL_FROM` — sender address for transactional emails (e.g. `"Anino Law Firm <noreply@example.com>"`). Must be quoted if it contains spaces or `<>`.
   - `MINIO_KMS_SECRET_KEY` — **required** for MinIO server-side encryption; generate with:

     ```bash
     openssl rand -base64 32
     ```

     Then set in `.env.dev` (and `.env.prod` for production):

     ```bash
     MINIO_KMS_SECRET_KEY=lawfirm-sse:<base64-key>
     MINIO_KMS_AUTO_ENCRYPTION=on
     ```

     **Use a different key per environment** (dev vs prod) and store it in a secrets manager — do **not** commit it. The key in `.env.*` is the sole decryption key: **losing it means permanent loss of all stored documents.**

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

## Storage Encryption (MinIO at-rest)

Object storage is encrypted **at rest** using MinIO Server-Side Encryption (SSE-S3)
with a single master key. This is **transparent to the application** — the app uploads
via presigned `PutObject` URLs and never sets encryption headers; MinIO encrypts each
object on write. No changes to `src/lib/s3.ts` or any app code are required.

### How it is configured

The `MINIO_KMS_SECRET_KEY` and `MINIO_KMS_AUTO_ENCRYPTION` environment variables must be set in `.env.dev` / `.env.prod` **before** running `make dev-up` / `make prod-up`. The format is:

```bash
MINIO_KMS_SECRET_KEY=lawfirm-sse:<base64-key>  # 32-byte base64 key
MINIO_KMS_AUTO_ENCRYPTION=on                    # Encrypt every new object
```

The `createbuckets` init container also runs `mc encrypt set sse-s3 local/law-firm-files` so the bucket itself declares the default encryption rule.

### Verifying

```bash
mc encrypt info local/law-firm-files          # → sse-s3 (lawfirm-sse)
mc stat local/law-firm-files/OBJECT_KEY       # → Encryption method: AES256
```

## Scheduled Reminder System

The app automatically sends reminder notifications for approaching milestone deadlines and upcoming consultations.

### How it works

An hourly background job checks for milestones/consultations that need reminders:

- **Milestones** — queries pending milestones where `due_date` is within `reminder_days` (per-record or env default). Sends `MilestoneDueSoon`. Past-due milestones send `MilestoneOverdue`.
- **Consultations** — queries scheduled consultations within the same window. Sends `ConsultationReminder` to Admins and Branch Managers.

Each record is only reminded once per day via the `last_reminded_at` field.

### Trigger mechanism

The scheduler supports two deployment models:

| Deployment                        | Trigger                                 | How                                                                        |
| --------------------------------- | --------------------------------------- | -------------------------------------------------------------------------- |
| **Docker (local or self-hosted)** | `node-cron` in `src/instrumentation.ts` | Runs hourly inside the long-lived Next.js process. No extra configuration. |
| **Vercel (serverless)**           | Cron Jobs → `GET /api/cron/reminders`   | Configure in Vercel Dashboard. Requires `CRON_SECRET` env var.             |

### Environment variables

| Variable                | Required   | Default | Description                                                                                                                                                                      |
| ----------------------- | ---------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DEFAULT_REMINDER_DAYS` | No         | `3`     | Global fallback when a milestone/consultation has no per-record `reminder_days` set                                                                                              |
| `CRON_SECRET`           | For Vercel | —       | Shared secret used to authenticate cron job requests. Generate with `openssl rand -hex 32`. Set as `Authorization: Bearer <secret>` header in your Vercel Cron Job configuration |

### Setting up on Vercel (optional)

1. Add `CRON_SECRET` to your Vercel project environment variables.
2. Define the cron job in `vercel.json`:

   ```json
   {
     "crons": [
       {
         "path": "/api/cron/reminders",
         "schedule": "0 * * * *"
       }
     ]
   }
   ```

   Use `0 * * * *` for hourly execution (Pro plan) or `0 0 * * *` for daily (Hobby plan).

3. Redeploy your project for cron changes to take effect.

> Hobby accounts are limited to cron jobs that run once per day. Expressions running more frequently will fail during deployment.
> The cron endpoint validates requests using the `CRON_SECRET` environment variable automatically.

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

```text
dev  --(work)-->  dev --(PR)--> main --(merge)--> auto-tag + GitHub Release
```

1. Work is committed to `dev` (or feature branches).
2. When ready, open a pull request from `dev` → `main`.
3. On merge to `main`, CI runs (`build` → `validate` → `test`).
4. If CI passes, a **CalVer tag** is created (e.g., `v2026.07.12.0`) and a **GitHub Release** is published with auto-generated release notes.

### Version Format

```text
v{YYYY}.{MM}.{DD}.{PATCH}
```

- `YYYY` — 4-digit year
- `MM` — 2-digit month
- `DD` — 2-digit day
- `PATCH` — zero-based increment for the day (resets daily)

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

1. Navigate to **Actions** → **CI & Release**
2. Click **Run workflow**
3. Select branch `main` and run

### Docker Production Build

The app version is read from `package.json` at build time and requires no
special flags. To override (e.g., for a staging build), pass the
`NEXT_PUBLIC_APP_VERSION` build arg:

```bash
NEXT_PUBLIC_APP_VERSION=staging-2026.07.12 docker build -t law-firm:latest .
```

### Vercel Deployment (Preview / Production)

The sidebar displays the app version via `NEXT_PUBLIC_APP_VERSION`, resolved from
`package.json` at build time. After each release, the CI workflow bumps
`package.json` to match the calver tag and pushes with `[skip ci]`. No
additional Vercel environment variables are needed for version display.

Optionally, override the version at deploy time by setting
`NEXT_PUBLIC_APP_VERSION` in your Vercel project dashboard.

## Using AI/LLM Coding Agents

This project includes an [AGENTS.md](./AGENTS.md) file that documents the full set of conventions, architecture decisions, and coding standards. If you use AI coding tools (Cursor, Claude Code, opencode, etc.), provide [AGENTS.md](./AGENTS.md) to the agent so it understands the project's structure and rules.
