# AGENTS.md - Law Firm Management System

- Never commit, push, or create PRs unless explicitly asked.
- Read the actual file first. Don't assume you know what's in it.
- After making changes, run `pnpm validate` + `pnpm build` and loop (fix issues, re-run until passing).

## Commands

- `pnpm dev` - dev server
- `pnpm build` - prisma:generate + next build
- `pnpm start` - production server
- `pnpm lint` / `pnpm lint:fix` - ESLint
- `pnpm format` - Prettier (with import sorting) + Prisma format
- `pnpm validate` - format + lint + `tsc --noEmit`
- `pnpm test` / `pnpm test:watch` - vitest
- `pnpm test:coverage` - vitest with coverage
- `pnpm test:browser` - vitest with Playwright
- `pnpm storybook` (port 6006) / `pnpm build-storybook`
- `pnpm prisma:migrate` / `pnpm prisma:deploy` / `pnpm prisma:generate`
- `pnpm prisma:seed` - `tsx prisma/seed.ts`
- `pnpm prisma:studio` - Prisma Studio
- `pnpm prepare` - husky + prisma generate (runs on install)

## Tech Stack

- Framework: Next.js 16 (App Router), React 19 + React Compiler.
- Language: TypeScript strict, `@/*` alias for `./src/*`.
- Styling: CSS Modules + design tokens (`src/styles/variables.css` primitives → semantic tokens). `clsx` for composition. Never inline styles.
- UI: `react-aria-components` — wrap Aria primitives in local components (e.g. `Button.tsx` wraps `Button as AriaButton`); extend Aria props, apply CSS modules via `clsx`, forward external `className`.
- Icons: `react-icons` (subpath imports like `react-icons/fa6`).
- Auth: NextAuth v5 beta (`next-auth@5.0.0-beta.31`) with Google OAuth, JWT sessions, PrismaAdapter.
- Data: Prisma 7 + PostgreSQL via `@prisma/adapter-pg`. Adapter pattern: `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })`. Generated client at `src/generated/prisma/`. Singleton at `src/lib/prisma.ts`. Prisma config at `prisma.config.ts`.
- Storage: `@aws-sdk/client-s3` api compatible for managing document storage attachments via secure, server-generated presigned URLs.
- Package Manager: pnpm.

## Architecture

- `src/app/page.tsx` — unauthenticated login page.
- `src/app/(dashboard)/` — authenticated section (Sidebar + Header shared layout). Dashboard routes: `dashboard/`, `case/`, `consultation/`, `user/`.
- API Routes — Restricted strictly to framework orchestration (`src/app/api/auth/[...nextauth]/route.ts`). Do not create custom REST endpoints under any circumstances.
- Server Actions (`actions.ts`) — The primary mechanism for all data mutation, form submission, and infrastructure execution (including generating storage presigned URLs). Every structural modification to application state must route through a Server Action.
- `src/features/` — domain logic organized by feature (`auth/`, `users/`, `consultations/`, `cases/`, etc.).
  - Each domain contains `actions.ts` (orchestration, validation, and authorization), `queries.ts` (Prisma read operations), and `mutations.ts` (Prisma write operations).
  - Feature-specific components live in `src/features/{domain}/components/`.
- `src/components/{ui,layout}/` — shared primitives (ui) and app chrome (layout). Domain-agnostic; reusable across features.
- `src/lib/` — shared utilities: `prisma.ts` (singleton), `auth.ts` (NextAuth config), `s3.ts` (S3 client instance initialization), etc.
- `src/styles/` — design tokens (`variables.css`: primitives → semantic tokens).
- `src/stories/` — Storybook stories for UI components, imported via `@/` aliases.
- Docker Compose for local Postgres: `docker compose up -d`.

## Conventions

### Styling

- Use only CSS custom properties from `variables.css`.
- Token system: primitives (`--raw-*`) → semantic tokens (`--color-*`, `--space-*`, etc.).
- Style exclusively via CSS Modules, imported as `styles` and composed with `clsx`.
- Never use inline styles (except storybooks) or global element selectors.
- Nesting in CSS Modules must mirror the component or document hierarchy (parent element nests children).
- Accept and forward external `className` props for overrides.
- Use only semantic tokens from `variables.css`; no hardcoded values.

- Responsives:
- Desktop first aproach CSS - mobile will be added later.
- Use flexbox whenever possible - avoid grid.
- `@media` only at `48rem` (use literal `rem` — CSS variables don't work in media queries).
- Avoid the use JS viewport detection or conditional mobile/desktop components for layout — use CSS where possible.

### Components

- Always scan and use existing components from `components/` first.
- Interactive/browser API components: start with `"use client"`.
- Co-locate in `src/components/{category}/{ComponentName}/` — component, CSS module.
- Stories live in `src/stories/`, imported via `@/` aliases (no relative `./` imports).
- Wrapping Aria components pattern: extend Aria props interface, add local variants/props, use explicit interface.
- Extract component props into a named interface extending the Aria type when adding local variants/props — keeps function signatures terse and consistent.

### Data Layer & Asset Storage

- Each feature domain (`src/features/{domain}/`) owns its data logic split across three files:
  - `actions.ts` — Next.js Server Actions (`"use server"`). This layer acts as the security and evaluation perimeter. It enforces authentication, evaluates role authorization, validates inputs via Zod schemas, and orchestrates calls to underlying mutations or queries.
  - `queries.ts` — Prisma read operations (`findUnique`, `findMany`, aggregate, etc.). Plain async functions (no `"use server"`).
  - `mutations.ts` — Prisma write operations (`create`, `update`, `upsert`, `delete`, etc.). Plain async functions.
- Execution Protocol: Components must never invoke `queries.ts` or `mutations.ts` directly if the action requires data filtering or mutation safety. Components call Server Actions to enforce authorization and schema validation boundaries. Server Components may call optimized, plain query functions from `queries.ts` exclusively for read operations where user session parameters are handled explicitly.
- Binary Document Management: File uploads must never stream through or be parsed by the Next.js runtime environment. When a client needs to save an item (e.g., a case file artifact):
  1. The client invokes a secure Server Action requesting a upload target.
  2. The Server Action validates permissions and generates an S3 presigned URL via `@aws-sdk/client-s3`.
  3. The client receives the URL and executes a native client-side `fetch` browser payload directly to the storage bucket.
- Never import `prisma` directly outside of `queries.ts` or `mutations.ts`.
- Co-locate feature-specific components in `src/features/{domain}/components/`. Only put truly shared/reusable components in `src/components/ui/`.

### Testing

- Test files live in `__tests__/` directories co-located with their feature/component (Next.js convention).
  Example: `src/features/users/__tests__/queries.test.ts`
- Naming: `*.test.ts` for logic, `*.test.tsx` for components.
- Mock `@/lib/prisma` via `vi.mock` for data-layer tests. Use Prisma types for mock values (no `as any`).

### Security & Boundary Safety

- Input Validation with Zod: Every exported Server Action must validate its input via `z.safeParse()` before executing any business logic. Do not declare schemas inside action files; import them from feature-specific schema files (e.g., `@/features/cases/schemas`) so they can be reused by client forms.
- String Hygiene & Parsing: Ensure all string parameters in schemas call `.trim().min(1)` and include a `.max()` constraint matching database limits to prevent malicious database exhaustion. Reject whitespace-only values.
- Strict Parameter Assurances: Validate all structural parameters meticulously. Ensure IDs call `.uuid()` or `.cuid()`, and enforce strictly defined sets using `z.nativeEnum(PrismaEnum)`. Never accept raw string inputs to cast them inside the function body via `as`.
- Standardized Action Responses: All Server Actions must wrap their execution blocks in try-catch structures and return an explicit `Promise<ActionResponse>`. Use `ActionDataResponse<T>` for queries/payloads, and `ActionStatusResponse` for data-less mutations. Never allow raw server exceptions to leak across the network boundary to the client.
- Centralized Auth Guards: Invoke unified, centralized protection functions like `requireAuth()` (which returns a verified session) or `requireRole(...roles)` at the very top of the execution flow. Do not write inline, ad-hoc `auth()` verification logic inside individual actions.
- Typed Payloads over Raw FormData: Client components must pass clean, typed objects to actions instead of raw `FormData`. Any necessary coercion or extraction from forms must occur on the client side before triggering the transition boundary.

### General

- Idiomatic, modular code is the top priority in this project, not a collection of hacks and workarounds.
- Named exports only — no default exports, except for Next.js special files (`page.tsx`, `layout.tsx`, `error.tsx`, `global-error.tsx`, `not-found.tsx`, `loading.tsx`, `route.tsx` etc.) which require a default export. Use inline `export default function` for these files.
- PascalCase components/types; camelCase variables/functions/files (component dirs are PascalCase).
- No comments unless explaining a non-obvious decision.
- Prisma schema: `snake_case` fields, `PascalCase` models/enums.
- Husky: pre-commit runs `lint-staged` (Prettier + ESLint on staged files); pre-push runs `pnpm validate && pnpm test`.

---

## TypeScript Coding Standards

### Parameter Typing and Readability

- Ban Destructured Inline Types: Never mix inline type declarations and object destructuring within function parameter signatures (e.g., `({ a, b }: { a: string; b: string })`).
- Parameter Handling for Standard Functions: For standard utility functions and business logic, pass complex inputs as a single unified object argument (e.g., `payload: DocumentPayload`) and destructure it within the first lines of the function body.
- Component Props Exception: Standard React Functional Components are exempt from the parameters-as-payload formatting rule. Component signatures may use inline destructuring of explicitly typed prop interfaces (e.g., `export function Button({ variant, children, ...props }: ButtonProps)`) to facilitate direct application of rest parameter extraction and prop forwarding.
- Inline Type Scope: Simple inline object types are permitted only if the object consists of 3 or fewer primitive properties, is not destructured in the signature, and is scoped entirely within a non-exported utility helper.

### Domain-Driven Naming (Anti-Nominal)

- No Function-Scoped Type Names: Do not name interfaces or types after a single specific function (avoid `ProcessDataArgs`).
- Focus on the Data Shape: Name types after the domain data or payload they represent (e.g., `DocumentPayload`, `UserSession`). This ensures types are structurally reusable across database utilities, API boundaries, and UI components.

### Boundary Type Strictness

- Explicit Returns at Boundaries: Always explicitly declare return types on public API endpoints, exported Server Actions, and shared hooks (e.g., `Promise<ActionResponse>`). This protects contracts and speeds up compilation times.
- Implicit Internal Returns: Allow TypeScript's native type inference engine to handle return types for internal, unexported helper functions or simple utility chains.

### Code Patterns

Avoid this signature clutter:

```typescript
// ANTI-PATTERN: Heavy cognitive load, zero reusability
export async function updateRecordAction({ id, status, retry }: { id: string; status: "pending" | "done"; retry: boolean }) { ... }
```

Enforce this clean, reusable structure:

```typescript
// IDIOMATIC: Clear boundaries, reusable domain types, flexible composition
export interface TaskPayload {
  id: string;
  status: "pending" | "done";
  retry: boolean;
}

export async function updateRecordAction(payload: TaskPayload): Promise<ActionStatusResponse> {
  const { id, status, retry } = payload;
  // implementation
  return { success: true };
}
```

#### Avoid overengineering:

Do not generate brand-new named interfaces if the function only returns a simple primitive object (like `{ id: string }`) or if it can be cleanly represented using TypeScript's native `Pick<PrismaModel, Keys>`. Only create a new named domain type if the output combines data from multiple sources or requires custom computed fields.
