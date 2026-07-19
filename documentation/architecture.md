# Architecture

## Tech Stack

| Layer          | Technology                                     | Purpose                                                       |
| -------------- | ---------------------------------------------- | ------------------------------------------------------------- |
| **Framework**  | Next.js 16 (App Router)                        | React framework with file-based routing and server components |
| **UI**         | React 19 + React Compiler                      | Automatic memoization                                         |
| **Language**   | TypeScript (strict)                            | Type-safe JavaScript                                          |
| **Styling**    | CSS Modules + `clsx` + `react-aria-components` | Scoped styles, accessible primitives                          |
| **Icons**      | `react-icons`                                  | Subpath imports (`react-icons/fa6`)                           |
| **ORM**        | Prisma 7 + `@prisma/adapter-pg`                | PostgreSQL with generated types at `src/generated/prisma/`    |
| **Auth**       | NextAuth v5 (JWT, Google OAuth, PrismaAdapter) | Authentication and session management                         |
| **Storage**    | `@aws-sdk/client-s3`                           | S3-compatible object storage via presigned URLs               |
| **Validation** | Zod                                            | Schema validation at the server boundary                      |
| **Linting**    | ESLint (flat config) + Prettier                | Code quality and formatting                                   |
| **Hooks**      | Husky + lint-staged                            | Pre-commit/pre-push gating                                    |
| **Testing**    | Vitest + Playwright                            | Unit and browser testing                                      |
| **Storybook**  | Storybook 10                                   | Component development environment                             |
| **Infra**      | Docker + Docker Compose                        | Containerized Postgres and MinIO                              |
| **CI/CD**      | GitHub Actions + Dependabot                    | Build, validate, release automation                           |

## Directory Layout

```
src/
├── app/
│   ├── (auth)/                          # Unauthenticated routes (login)
│   ├── (dashboard)/                     # Authenticated routes (sidebar + header)
│   │   ├── dashboard/
│   │   ├── case/
│   │   ├── consultation/
│   │   └── user/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts  # NextAuth handler
│   │   └── cron/*/route.ts              # Scheduled job webhooks
│   ├── layout.tsx                       # Root layout
│   ├── error.tsx
│   └── not-found.tsx
├── components/
│   ├── ui/                              # Shared primitives (Button, Modal, etc.)
│   └── layout/                          # App chrome (Sidebar, Header)
├── features/                            # Domain logic, organized by feature
│   ├── auth/
│   ├── users/
│   ├── consultations/
│   ├── cases/
│   ├── tasks/
│   ├── milestones/
│   ├── documents/
│   ├── payments/
│   ├── notes/
│   ├── notifications/
│   ├── reminders/
│   ├── clients/
│   ├── dashboard/
│   └── audit/
├── generated/prisma/                    # Generated Prisma client (gitignored)
├── lib/                                 # Shared utilities
│   ├── prisma.ts                        # Prisma singleton
│   ├── auth.ts                          # NextAuth config
│   ├── s3.ts                            # S3 client instance
│   ├── auth-guards.ts                   # requireAuth(), requireRole()
│   ├── form-utils.ts                    # Form validation helpers
│   ├── email.ts                         # Transactional email
│   └── action-response.ts               # ActionStatusResponse types
├── styles/
│   └── variables.css                    # Design tokens (primitives → semantic)
└── stories/                             # Storybook stories
```

## Data Flow

### API Routes vs Server Actions

- **API Routes** — Restricted to NextAuth (`app/api/auth/[...nextauth]/`) and cron webhooks (`app/api/cron/*/`). Do not create custom REST endpoints for application data.
- **Server Actions** (`actions.ts`) — The primary mechanism for all data mutation, form submission, and infrastructure execution (including generating S3 presigned URLs). Every structural modification to application state routes through a Server Action.

### Feature Domain Pattern

Each domain in `src/features/{domain}/` owns three files:

| File           | Purpose                                                      | Runs on                    |
| -------------- | ------------------------------------------------------------ | -------------------------- |
| `queries.ts`   | Prisma read operations (`findUnique`, `findMany`, aggregate) | Server only                |
| `mutations.ts` | Prisma write operations (`create`, `update`, `delete`)       | Server only                |
| `actions.ts`   | Server Actions: auth guards, Zod validation, orchestration   | Server (invoked by client) |

**Execution protocol:**

- Components call **Server Actions** (`actions.ts`) for any operation that needs authorization or mutation safety.
- Server Components may call `queries.ts` directly for read-only operations where the session is handled explicitly.
- Components must never invoke `queries.ts` or `mutations.ts` directly if the action requires authorization.

### Document Storage Flow (S3 Presigned URLs)

File uploads never stream through the Next.js runtime:

1. Client invokes a secure Server Action requesting an upload target.
2. Server Action validates permissions and generates an S3 presigned URL via `@aws-sdk/client-s3`.
3. Client receives the URL and performs a native `fetch` directly to the storage bucket.

## Security Boundaries

| Concern              | Mechanism                                                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Auth**             | `requireAuth()` — centralized, returns verified session                                                                            |
| **Role enforcement** | `requireRole(...roles)` — at top of every action flow                                                                              |
| **Input validation** | Zod schemas (declared in feature `schemas.ts`, imported by actions)                                                                |
| **String hygiene**   | `.trim().min(1).max()` — reject whitespace-only, enforce DB limits                                                                 |
| **IDs**              | `.uuid()` or `.cuid()` — never `as` casts                                                                                          |
| **Enums**            | `z.enum(PrismaEnum)` from `@/generated/prisma/browser` — never raw strings                                                         |
| **Action responses** | Reads return data directly (throw for unrecoverable); writes return `ActionStatusResponse` (catch errors, never leak stack traces) |
| **Client bundle**    | Import Prisma types from `@/generated/prisma/browser`, never `client` (avoid `node:` module breakage)                              |

## Conventions

See [AGENTS.md](../AGENTS.md) for the full conventions reference covering:

- **Styling** — CSS Modules, design tokens, flexbox-first responsive
- **Components** — RAC wrapping pattern, `"use client"` boundary, prop interfaces
- **Data Layer** — actions/queries/mutations split, presigned URL flow
- **Testing** — `__tests__/` co-location, `vi.mock(prisma)`, no `as any`
- **Async/Error** — `async/await`, structured error responses, toast surface
- **TypeScript** — no inline destructured types, domain-driven naming, explicit return types at boundaries
- **Documentation** — JSDoc required on `src/lib/` only

## App Version

The sidebar displays the current version via `NEXT_PUBLIC_APP_VERSION`:

| Context               | Value                             |
| --------------------- | --------------------------------- |
| CI release build      | CalVer tag (e.g. `v2026.07.12.0`) |
| Local dev             | `0.0.0-dev`                       |
| Docker build (no arg) | `0.0.0-dev`                       |

Override locally: `NEXT_PUBLIC_APP_VERSION=my-branch pnpm dev`
