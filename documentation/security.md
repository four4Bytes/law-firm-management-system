# Security

## Authentication

### Google OAuth Only

The system uses **Google OAuth 2.0** as its sole authentication provider. There is no password-based login. All users must sign in with a Google account.

- Provider: `next-auth/providers/google`
- Sessions use **JWT strategy** (no database sessions).
- `allowDangerousEmailAccountLinking` is enabled to avoid `OAuthAccountNotLinked` errors when the same Google account is used across environments.

### Sign-In Flow

1. User authenticates via Google.
2. The `signIn` callback verifies `email_verified` is `true`.
3. If the email is in `DEVELOPER_EMAILS` (allowlist), a developer account is upserted and access is granted. This bypasses the normal user database — useful for bootstrapping and development.
4. For non-developer emails: the user must exist in the `User` table and have `is_active = true`. Access is denied (`signIn` returns `false`) otherwise.
5. On sign-in, the user's name and avatar are synced from Google via `syncUserFromGoogle`.

### JWT Session Callbacks

| Callback                      | Purpose                                                                                                                           |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `jwt({ token })`              | Looks up the database user by `token.email`. Rejects inactive users by returning `null`. Projects `role` and `id` onto the token. |
| `session({ session, token })` | Projects `role`, `id`, and `image` from the token onto the session object for downstream use.                                     |

### Developer Email Bypass

The `DEVELOPER_EMAILS` environment variable is a comma-separated list of email addresses that can sign in without being pre-registered in the User table. Each sign-in creates or updates a "Developer Account" user record if one doesn't exist.

See `src/lib/developer-emails.ts`.

## Authorization

### Guard Functions

Defined in `src/lib/auth-guards.ts`.

| Function                | Throws           | Description                                                                                               |
| ----------------------- | ---------------- | --------------------------------------------------------------------------------------------------------- |
| `requireAuth()`         | `"Unauthorized"` | Ensures a valid session with `id`, `email`, `role`, `name`. Used for any action needing the current user. |
| `requireRole(...roles)` | `"Forbidden"`    | Calls `requireAuth()`, then checks the user has one of the specified roles.                               |

**Usage pattern** — every Server Action calls one of these at the top:

```ts
export async function createCaseAction(payload: CasePayload): Promise<ActionStatusResponse> {
  const session = await requireAuth(); // or requireRole("Admin", "BranchManager")
  // ... validated + authorized
}
```

### Role-Based Access Control (RBAC)

RBAC enforcement is **not yet implemented**. The planned permission model is documented in [Specification — Global Permissions](./specification.md#global-permissions) and [Case Context Permissions](./specification.md#case-context-permissions).

The `Role` enum in `prisma/schema.prisma` defines: `Dev`, `Admin`, `BranchManager`, `Lawyer`, `Paralegal`, `ProcessServer`.

## Input Validation

### Zod Schemas

Every Server Action validates its input via `z.safeParse()` before executing any business logic. Schemas are declared in feature `schemas.ts` files and imported by actions and client forms.

Key validation conventions (see `src/lib/form-utils.ts`):

| Builder                        | Purpose                                                                      |
| ------------------------------ | ---------------------------------------------------------------------------- |
| `requiredText(max, label)`     | Required string, trimmed, `min(1)` + `max(max)`. User-facing error messages. |
| `optionalText(max, label)`     | Optional trimmed string, capped max length.                                  |
| `requiredEnum(enumObj, label)` | Must match a member of the given Prisma enum.                                |
| `emailText(label)`             | Required, trimmed, max 255, pipe-validated email format.                     |
| `positiveNumber(max, label)`   | Coerced positive number capped at max.                                       |
| `nonNegativeInteger(label)`    | Integer >= 0.                                                                |

**String hygiene** — All string parameters are `.trim().min(1)` with a `.max()` matching DB column limits. Whitespace-only values are rejected.

**IDs** — Validated as `.uuid()` or `.cuid()`. Never cast from raw input via `as`.

### Typed Payloads (No Raw FormData)

Client components pass typed objects to actions, not raw `FormData`. Any form-to-object coercion happens on the client before the transition boundary. This prevents type confusion and injection through unstructured form data.

## Action Security

### Response Convention

| Action Type                       | Return Type                                                       | Error Handling                                                                                          |
| --------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Read (queries, paginated fetches) | Data directly (e.g. `Promise<{ rows: T[]; nextCursor: string }>`) | Throw for unrecoverable errors — framework error boundary handles display.                              |
| Write (create, update, delete)    | `ActionStatusResponse` or `ActionDataResponse<T>`                 | Wrapped in `try/catch`. On failure: `{ success: false, error: "message" }`. Never leaks raw exceptions. |

Defined in `src/lib/action-response.ts`:

```ts
interface ActionStatusResponse {
  success: boolean;
  error?: string;
}

interface ActionDataResponse<T> extends ActionStatusResponse {
  data?: T;
}
```

This prevents server stack traces and sensitive information from reaching the client.

## File Upload Security

### Presigned URLs (No Server-Side Streaming)

File uploads **never stream through the Next.js runtime**. The flow is:

1. Client invokes a Server Action requesting an upload URL.
2. Server Action validates permissions and generates an S3 presigned **PUT** URL via `@aws-sdk/client-s3`.
3. Client uploads directly to the S3 bucket using `fetch` with the presigned URL.

### URL Expiry

| Operation      | Default Expiry |
| -------------- | -------------- |
| Upload (PUT)   | 5 minutes      |
| Download (GET) | 1 hour         |

### Key Generation

Object keys follow the pattern `{parentType}/{parentId}/{uuid}.{ext}`, e.g. `cases/abc-123/uuid.pdf`. See `src/lib/s3.ts:generateKey`.

### Download Filename Sanitization

Control characters (`\x00-\x1f`) and quotes (`"`, `\`) are stripped from filenames in `Content-Disposition` headers. See `src/lib/s3.ts:sanitizeFilename`.

### Storage Encryption at Rest

MinIO SSE-S3 encrypts every object on write. The application never sets encryption headers — encryption is configured at the bucket level and is transparent. See [Deployment — Storage Encryption](./deployment.md#storage-encryption).

## Environment Variable Safety

All `process.env` reads go through typed accessors in `src/lib/env.ts`:

| Accessor                             | Behavior                                   |
| ------------------------------------ | ------------------------------------------ |
| `getRequiredEnvVar(name)`            | Throws if unset, empty, or whitespace-only |
| `getOptionalEnvVar(name, fallback)`  | Returns fallback when unset                |
| `getEnvBoolean(name)`                | Parses `true`/`1`/`yes`/`on` as truthy     |
| `getRequiredInteger(name)`           | Throws if missing or not an integer        |
| `getOptionalInteger(name, fallback)` | Returns fallback when unset                |

This ensures misconfigured environments fail early with clear messages.

## Audit Logging

All structural mutations are logged via `createAuditLog` in `src/features/audit/mutations.ts`.

| Field                       | Content                                                                  |
| --------------------------- | ------------------------------------------------------------------------ |
| `actor_user_id`             | The authenticated user performing the action                             |
| `action`                    | Describes the mutation (e.g. `"consultation.created"`, `"task.updated"`) |
| `entity_type` / `entity_id` | The affected resource                                                    |
| `details`                   | Human-readable summary                                                   |

Audit logs are **immutable** — they are created automatically by the system and no API exists to modify or delete them. All roles have read-only access.

## Cron Job Security

### Docker (Self-Hosted)

A `node-cron` job runs hourly inside the Next.js process via `src/instrumentation.ts`. No external authentication required.

### Vercel (Serverless)

Cron requests hit `GET /api/cron/reminders` and are authenticated via a `CRON_SECRET` environment variable:

- Generate: `openssl rand -hex 32`
- Sent as `Authorization: Bearer <secret>` header
- The endpoint rejects requests without a valid token

## Client Bundle Safety

Prisma types used by client components must be imported from `@/generated/prisma/browser`, never `@/generated/prisma/client`. The `client` entry imports Node.js builtins (`node:`) which break Turbopack bundling and cause `next build` failures.

## Email Security

Transactional emails are sent via Nodemailer. The `EMAIL_FROM` environment variable defines the sender address (must be quoted if it contains spaces or `<>`). Notifications are dispatched only to intended recipients via `dispatchNotifications` in `src/features/notifications/dispatch.ts`.
