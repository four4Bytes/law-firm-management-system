# AGENTS.md - Law Firm Management System

- Never commit, push, or create PRs unless explicitly asked.
- Read the actual file first. Don't assume you know what's in it.
- After making changes, run `pnpm validate` and loop (fix issues, re-run until passing).

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
- Package Manager: pnpm.

## Architecture

- `src/app/page.tsx` — unauthenticated login page.
- `src/app/(dashboard)/` — authenticated section (Sidebar + Header shared layout).
- `src/app/api/auth/[...nextauth]/route.ts` — NextAuth API route.
- `src/features/` — domain logic (auth, consultations, users).
- `src/components/{ui,layout}/` — shared primitives and app chrome.
- Docker Compose for local Postgres: `docker compose up -d` (creds: testing/testing).

## Conventions

### Styling

- Use only CSS custom properties from `variables.css`.
- Token system: primitives (`--raw-*`) → semantic tokens (`--color-*`, `--space-*`, etc.).
- Style exclusively via CSS Modules, imported as `styles` and composed with `clsx`.
- Never use inline styles (except storybooks) or global element selectors.
- Nesting in CSS Modules must mirror the component or document hierarchy (parent element nests children).
- Accept and forward external `className` props for overrides.
- Use only semantic tokens from `variables.css`; no hardcoded values.

### Components

- Always scan and use existing components from `components/` first.
- Interactive/browser API components: start with `"use client"`.
- Co-locate in `src/components/{category}/{ComponentName}/` — component, CSS module, stories.
- Wrapping Aria components pattern: extend Aria props interface, add local variants/props, use explicit interface.

### General

- Named exports only — no default exports.
- PascalCase components/types; camelCase variables/functions/files (component dirs are PascalCase).
- No comments unless explaining a non-obvious decision.
- Prisma schema: `snake_case` fields, `PascalCase` models/enums.
- Husky: pre-commit runs `lint-staged` (Prettier + ESLint on staged files); pre-push runs `pnpm validate && pnpm test`.

## Known State

- No unit tests exist (`*.test.*` files) — only Storybook stories for UI components.
- Browser test script (`test:browser`) references `vitest.workspace.ts` which does not yet exist.
