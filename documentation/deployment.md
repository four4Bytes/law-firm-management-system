# Deployment

## Release Workflow

The project uses **CalVer** (Calendar Versioning) with automatic tagging on every merge to `main`.

### Version Format

```
v{YYYY}.{MM}.{DD}.{PATCH}
```

- `YYYY` - 4-digit year, `MM` - 2-digit month, `DD` - 2-digit day
- `PATCH` - zero-based increment for the day (resets daily)

Examples: `v2026.07.12.0`, `v2026.07.12.1`, `v2026.08.01.0`

### Branching Flow

```
dev  ──(work)──>  dev ──(PR)──> main ──(merge)──> auto-tag + GitHub Release
                                                      └── Docker build & push to GHCR
```

1. Work is committed to `dev` (or feature branches off `dev`).
2. When ready, open a pull request from `dev` → `main`.
3. On merge to `main`, CI runs (`build` → `validate` → `test`).
4. If CI passes, a **CalVer tag** is created and a **GitHub Release** is published with auto-generated release notes.
5. A Docker image is built and pushed to **GitHub Container Registry** with the CalVer tag and `latest`.

### Cutting a Release

```bash
# 1. Ensure dev is up to date and clean
git checkout dev && git pull

# 2. Merge into main
git checkout main && git merge dev
git push origin main    # triggers CI + auto-release

# 3. Verify the release on GitHub
```

### Manual Trigger

From the GitHub Actions tab:

1. **Actions** → **CI & Release**
2. Click **Run workflow**
3. Select branch `main` and run

## CI & GitHub Actions

All automation lives in `.github/`. Workflows key off the `dev` → `main` pull flow: pull requests run the checks, pushes to `main` additionally release and push the Docker image.

### Workflow files

| File             | Purpose                             | Triggers                                                                   |
| ---------------- | ----------------------------------- | -------------------------------------------------------------------------- |
| `ci-release.yml` | Checks, CalVer release, Docker push | Push to `main` or `dev`, PR to `main` or `dev`, manual `workflow_dispatch` |
| `codeql.yml`     | CodeQL security scanning            | Push / PR to `main` or `dev`, scheduled weekly (Wed 12:17 UTC)             |
| `labeler.yml`    | Auto-label PRs from branch prefixes | Pull request opened / synchronized / reopened (`pull_request_target`)      |

### PR labeling & release notes

`.github/labeler.yml` maps branch prefixes to PR labels:

| Branch prefix          | Labels          |
| ---------------------- | --------------- |
| `feat/`, `feature/`    | `feature`       |
| `fix/`, `bugfix/`      | `bug`, `fix`    |
| `chore/`               | `chore`         |
| `ci/`                  | `ci`            |
| `refactor/`            | `refactor`      |
| `docs/`, `doc/`        | `documentation` |
| `deps/`, `dependabot/` | `dependencies`  |

These labels select the release-notes categories in `.github/release.yml`: `New Features`, `Bug Fixes`, `Maintenance & CI`, `Documentation Updates`, `Dependency Updates`, `Other Changes`.

Dependabot (`.github/dependabot.yml`) opens weekly npm dependency PRs against **`dev`**, so they are labeled `dependencies` automatically.

### CI & Release pipeline (`ci-release.yml`)

On every push to `main` or `dev`, the **`ci`** stage runs; **`release`** → **`docker`** run only on pushes to `main` (PRs run `ci` only). A failing check blocks merging. Concurrency cancels prior runs on the same ref except `main`.

**`ci`** - `ubuntu-latest`: Node 22 via `pnpm/action-setup` + `setup-node` (pnpm cache), `pnpm install --frozen-lockfile`, then `pnpm build` → `pnpm validate` → `pnpm test` (ESLint and Next.js build caches are persisted between runs).

**`release`** - push to `main` only (non-PR, `workflow_dispatch` allowed), requires `ci`; authenticated via a dedicated GitHub App using the `RELEASE_APP_ID` / `RELEASE_APP_PRIVATE_KEY` secrets (elevates to `contents: write`):

1. Computes the next CalVer tag `v{YYYY}.{MM}.{DD}.{PATCH}` (increments same-day tags, skips if the tag already exists).
2. Generates the changelog from PRs merged into **`main`** (`generate-notes` with `target_commitish="main"` + `previous_tag_name`, categories from `.github/release.yml` excluding `skip-changelog`; header is prepended in the workflow since `release.yml` `header` is unsupported).
3. Creates the GitHub Release tagged with the CalVer, targeting the `main` HEAD (tag-only, no `package.json` commit).

**`docker`** - push to `main` only, requires `release`: builds from the root `Dockerfile` with `NEXT_PUBLIC_APP_VERSION` = CalVer version and pushes `ghcr.io/four4bytes/law-firm-management-system` under the **CalVer tag** and **`latest`** (GHCR auth via the automatic `GITHUB_TOKEN`, `packages: write`). See [Docker Image](#docker-image).

### Required repository secrets

| Secret                    | Used by   | Purpose                                                         |
| ------------------------- | --------- | --------------------------------------------------------------- |
| `RELEASE_APP_ID`          | `release` | GitHub App ID issuing the bot token for release writes          |
| `RELEASE_APP_PRIVATE_KEY` | `release` | GitHub App PEM private key for the bot token                    |
| `GITHUB_TOKEN`            | all       | Automatic token (perms per job: `packages: write` for `docker`) |

## Auto-Review (CodeRabbit)

Every PR targeting `dev` or `main` is automatically reviewed by [CodeRabbit](https://coderabbit.ai).

- Checks for logic errors, security issues, test gaps, and style violations.
- Reviews are posted as PR comments within minutes of opening.
- Address CodeRabbit findings before requesting a human review.

No local configuration - enabled at the GitHub organization level.

## Docker Image

The project builds and publishes a Docker image automatically on every push to `main` as part of the CI & Release workflow.

### Registry

```
ghcr.io/four4bytes/law-firm-management-system
```

| Tag          | Example         | Description                     |
| ------------ | --------------- | ------------------------------- |
| **CalVer**   | `v2026.07.20.0` | Matches the GitHub Release tag  |
| **`latest`** | `latest`        | Points to the most recent build |

### Pulling the image

The package is **public**:

```bash
docker pull ghcr.io/four4bytes/law-firm-management-system:latest
```

### Build

The Docker image is built using the `Dockerfile` at the project root. The `NEXT_PUBLIC_APP_VERSION` build arg is automatically set by CI to the CalVer version (from `needs.release.outputs.version`, without the `v` prefix).

To build locally for testing:

```bash
docker build -t law-firm:latest .
```

### Local pull authentication (optional)

If you need to pull a private image or push to GHCR locally, authenticate using a [GitHub personal access token](https://github.com/settings/tokens) with `read:packages` / `write:packages` scope:

```bash
echo "<token>" | docker login ghcr.io -u <username> --password-stdin
```

### Production Stack

```bash
make prod-up       # Build and start production containers
make prod-down     # Stop production containers
make prod-reset    # Hard reset
```

Uses `docker-compose.prod.yml` with `.env.prod` environment variables.

## Vercel Deployment

The sidebar displays the app version via `NEXT_PUBLIC_APP_VERSION`, resolved at build time from the `NEXT_PUBLIC_APP_VERSION` build arg (CalVer tag injected by CI via `needs.release.outputs.version`) with a fallback to `package.json` version (`next.config.ts:5`).

Optionally, override the version at deploy time by setting `NEXT_PUBLIC_APP_VERSION` in the Vercel project dashboard.

## Storage Encryption

Object storage is encrypted **at rest** using SeaweedFS Server-Side Encryption (SSE-S3) with a single key-encryption key. This is transparent to the application - the app uploads via presigned `PutObject` URLs and never sets encryption headers; SeaweedFS encrypts each object on write.

### Configuration

Set these in `.env.dev` / `.env.prod` **before** running `make dev-up` / `make prod-up`:

```bash
SEAWEEDFS_SSE_KEK=<64-character-hex-key>          # Stable 256-bit SSE-S3 KEK
```

Generate the key:

```bash
openssl rand -hex 32     # → outputs a 64-character hex string
```

**Use a different key per environment** (dev vs prod) and store it in a secrets manager. Do not commit it. Losing the key means permanent loss of all stored documents.

The SeaweedFS service receives the KEK through `WEED_S3_SSE_KEK`. The `createbuckets` init container uses the AWS CLI against SeaweedFS to declare the bucket's default SSE-S3 rule.

### Verification

```bash
aws --endpoint-url http://localhost:9000 s3api get-bucket-encryption --bucket law-firm-files
aws --endpoint-url http://localhost:9000 s3api head-object --bucket law-firm-files --key OBJECT_KEY
```

## Scheduled Reminder System

> The full behavior (recipients, windows, claim/suppress semantics, retention) is specified in [Notifications & Reminders](./notifications.md). This section covers deployment concerns only.

### How it works

The job calls `runReminderCheck()` in `src/features/reminders/scheduler.ts` daily - all behavioral rules (recipients, windows, claim/suppress semantics, retention) live in the spec linked above. This section only covers the operational setup required to run it.

### Trigger mechanism

| Deployment                    | Trigger                                 | Details                                                                                   |
| ----------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------- |
| Docker (local or self-hosted) | `node-cron` in `src/instrumentation.ts` | Runs on schedule inside the long-lived Next.js process (guarded by `process.env.VERCEL`). |
| Vercel (serverless)           | Vercel Cron Jobs                        | Scheduled via `vercel.json` crons config. Sends `GET /api/cron/reminders`.                |

### Environment variables

| Variable                      | Required       | Default       | Description                                                                                                                                              |
| ----------------------------- | -------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DEFAULT_REMINDER_DAYS`       | No             | `3`           | Global fallback when a milestone/consultation has no per-record `reminder_days` set                                                                      |
| `NOTIFICATION_RETENTION_DAYS` | No             | `90`          | Delete Notification rows older than this many days (runs with the daily job)                                                                             |
| `APP_TIMEZONE`                | No             | `Asia/Manila` | IANA timezone for server-side date/time formatting, the reminder day boundary, and the self-hosted cron trigger (set to any IANA zone for worldwide use) |
| `CRON_SECRET`                 | Yes (all envs) | -             | Shared secret for authenticating cron requests. Generate with `openssl rand -hex 32`. Add to Vercel Environment Variables.                               |

### Setting up with Vercel Cron Jobs

1. **Create `vercel.json`** in the project root with the cron job definition:

   ```json
   {
     "crons": [
       {
         "path": "/api/cron/reminders",
         "schedule": "0 16 * * *"
       }
     ]
   }
   ```

2. **Generate a `CRON_SECRET`** (if you don't have one):

   ```bash
   openssl rand -hex 32
   ```

3. **Add it to Vercel** - Project Dashboard → Settings → Environment Variables → add `CRON_SECRET`.

4. **Deploy** - `vercel --prod`. Vercel automatically registers the cron and sends the `Authorization: Bearer <CRON_SECRET>` header on each invocation.

With the default `APP_TIMEZONE=Asia/Manila`, the cron runs daily at **app-timezone midnight**. Vercel interprets the schedule in **UTC**, so the expression is written as the UTC instant that equals local midnight: `0 16 * * *` is 16:00 UTC, which is 00:00 the next day in `Asia/Manila`. This matches the self-hosted `node-cron` in `src/instrumentation.ts`, which schedules `0 0 * * *` with `timezone: getAppTimeZone()`.

**Changing `APP_TIMEZONE` requires updating `vercel.json` too.** The UTC offset is baked into each schedule, so offset changes may require changing the UTC hour and/or minute (and the weekday for a weekly job). A fixed Vercel schedule cannot maintain local midnight year-round in a timezone with DST; update `vercel.json` and redeploy whenever the offset changes. `vercel.json` cannot hold comments, so this table records the conversion:

| Job          | Local time (`Asia/Manila`) | `vercel.json` expression | UTC instant    |
| ------------ | -------------------------- | ------------------------ | -------------- |
| `reminders`  | 00:00 daily                | `0 16 * * *`             | 16:00 daily    |
| `storage-gc` | 03:00 Sunday               | `0 19 * * 6`             | 19:00 Saturday |

To adjust the cadence, update the `schedule` field in `vercel.json` and redeploy. See [Dates & timezones](./dates-and-timezones.md) for the general rule.

## Storage Garbage Collection Sweep

The storage GC job deletes orphaned S3 objects that no longer reference a `Document` row in the database. It is invoked via `GET /api/cron/storage-gc` and uses the same `CRON_SECRET` bearer authentication as the reminders cron.

### Trigger mechanism

| Deployment                    | Trigger                                  | Details                                                                     |
| ----------------------------- | ---------------------------------------- | --------------------------------------------------------------------------- |
| Docker (local or self-hosted) | External scheduler (cron, systemd, etc.) | Call `GET /api/cron/storage-gc` on your desired schedule (e.g., weekly).    |
| Vercel (serverless)           | Vercel Cron Jobs                         | Scheduled via `vercel.json` crons config. Sends `GET /api/cron/storage-gc`. |

### Environment variables

Uses the same `CRON_SECRET` as the reminders cron.

### Setting up with Vercel Cron Jobs

Add the storage-gc path to your `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/reminders",
      "schedule": "0 16 * * *"
    },
    {
      "path": "/api/cron/storage-gc",
      "schedule": "0 19 * * 6"
    }
  ]
}
```

The example above runs the GC sweep weekly on **Sunday at 03:00 `Asia/Manila`** - 19:00 UTC on Saturday, after the daily reminders job. Adjust the schedule to suit your retention needs, keeping the UTC conversion in mind.

### Setting up with self-hosted cron

Set the external scheduler's timezone to UTC. For a cron implementation that supports `CRON_TZ`, use this entry to call the endpoint with the bearer token:

```bash
# Example: weekly at 03:00 Asia/Manila on Sunday (19:00 UTC Saturday)
CRON_TZ=UTC
0 19 * * 6 curl --fail --silent --show-error -H "Authorization: Bearer ${CRON_SECRET}" https://your-domain/api/cron/storage-gc
```
