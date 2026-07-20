# Deployment

## Release Workflow

The project uses **CalVer** (Calendar Versioning) with automatic tagging on every merge to `main`.

### Version Format

```
v{YYYY}.{MM}.{DD}.{PATCH}
```

- `YYYY` — 4-digit year, `MM` — 2-digit month, `DD` — 2-digit day
- `PATCH` — zero-based increment for the day (resets daily)

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

## Auto-Review (CodeRabbit)

Every PR targeting `dev` or `main` is automatically reviewed by [CodeRabbit](https://coderabbit.ai).

- Checks for logic errors, security issues, test gaps, and style violations.
- Reviews are posted as PR comments within minutes of opening.
- Address CodeRabbit findings before requesting a human review.

No local configuration — enabled at the GitHub organization level.

## Docker Image

The project builds and publishes a Docker image automatically on every push to `main` as part of the CI & Release workflow.

### Registry

```
ghcr.io/four4Bytes/law-firm-management-system
```

| Tag          | Example         | Description                     |
| ------------ | --------------- | ------------------------------- |
| **CalVer**   | `v2026.07.20.0` | Matches the GitHub Release tag  |
| **`latest`** | `latest`        | Points to the most recent build |

### Pulling the image

The package is **public**:

```bash
docker pull ghcr.io/four4Bytes/law-firm-management-system:latest
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

The sidebar displays the app version via `NEXT_PUBLIC_APP_VERSION`, resolved from `package.json` at build time. After each release, the CI workflow bumps `package.json` to match the CalVer tag and pushes with `[skip ci]`.

Optionally, override the version at deploy time by setting `NEXT_PUBLIC_APP_VERSION` in the Vercel project dashboard.

## Storage Encryption

Object storage is encrypted **at rest** using MinIO Server-Side Encryption (SSE-S3) with a single master key. This is transparent to the application — the app uploads via presigned `PutObject` URLs and never sets encryption headers; MinIO encrypts each object on write.

### Configuration

Set these in `.env.dev` / `.env.prod` **before** running `make dev-up` / `make prod-up`:

```bash
MINIO_KMS_SECRET_KEY=lawfirm-sse:<base64-key>  # 32-byte base64 key
MINIO_KMS_AUTO_ENCRYPTION=on                    # Encrypt every new object
```

Generate the key:

```bash
openssl rand -base64 32   # → outputs a 44-character base64 string
```

**Use a different key per environment** (dev vs prod) and store it in a secrets manager. Do not commit it. Losing the key means permanent loss of all stored documents.

The `createbuckets` init container in the Docker compose setup runs `mc encrypt set sse-s3 local/law-firm-files` so the bucket declares the default encryption rule.

### Verification

```bash
mc encrypt info local/law-firm-files          # → sse-s3 (lawfirm-sse)
mc stat local/law-firm-files/OBJECT_KEY       # → Encryption method: AES256
```

## Scheduled Reminder System

The app automatically sends reminder notifications for approaching milestone deadlines and upcoming consultations.

### How it works

An hourly background job checks for milestones and consultations that need reminders:

- **Milestones** — Queries pending milestones where `due_date` is within `reminder_days` (per-record or env default). Sends `MilestoneDueSoon`. Past-due milestones send `MilestoneOverdue`.
- **Consultations** — Queries scheduled consultations within the same window. Sends `ConsultationReminder` to Admins and Branch Managers.

Each record is only reminded once per day via the `last_reminded_at` field.

### Trigger mechanism

| Deployment                    | Trigger                                 | Details                                                                                   |
| ----------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------- |
| Docker (local or self-hosted) | `node-cron` in `src/instrumentation.ts` | Runs on schedule inside the long-lived Next.js process (guarded by `process.env.VERCEL`). |
| Vercel (serverless)           | GitHub Actions workflow                 | Scheduled via `.github/workflows/reminder-cron.yml`. Sends `GET /api/cron/reminders`.     |

### Environment variables

| Variable                | Required       | Default | Description                                                                                                                         |
| ----------------------- | -------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `DEFAULT_REMINDER_DAYS` | No             | `3`     | Global fallback when a milestone/consultation has no per-record `reminder_days` set                                                 |
| `CRON_SECRET`           | Yes (all envs) | —       | Shared secret for authenticating cron requests. Generate with `openssl rand -hex 32`. Must match between Vercel and GitHub Secrets. |

### Setting up with GitHub Actions

On Vercel's free (Hobby) plan, native cron jobs are limited to once per day. The project uses a
**GitHub Actions workflow** to trigger the reminder endpoint on a flexible schedule — no platform
upgrade required.

1. **Generate a `CRON_SECRET`** (if you don't have one):

   ```bash
   openssl rand -hex 32
   ```

2. **Add it to Vercel** — Project Dashboard → Settings → Environment Variables → add `CRON_SECRET`.

3. **Add it to GitHub** — Repository → Settings → Secrets and variables → Actions → **New repository secret** → name `CRON_SECRET`, paste the same value.

4. **Set the deployment URL** in `.github/workflows/reminder-cron.yml`:

   Replace `https://your-app.vercel.app` with your actual Vercel production URL.

5. **Push the workflow file** to `main` (or any branch). GitHub Actions registers the schedule automatically.

The workflow is configured at `0 */4 * * *` (every 4 hours). To adjust the cadence or trigger a run
manually, go to the **Actions** tab → **Reminder Cron** → **Run workflow**.
