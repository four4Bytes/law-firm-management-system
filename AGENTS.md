# AGENTS.md - Law Firm Management System

## CORE RULES

- Always read and follow what is written in here!
- Always read the actual file first. Never assume you know what's in it.
- Never commit, push, or create PRs unless explicitly asked. Not even "just fixing a typo". Not even staged.
- Read surrounding context (imports, neighboring files) before editing. Understand conventions before writing.
- Read `package.json` for the quick project info, latest deps and aliases.
- If you're unsure about something, ask. Don't guess.

## TECH STACK

- Framework: Next.js 16 (App Router), React 19 + React Compiler
- Language: TypeScript (strict mode, `@/*` path alias for `./src/*`)
- Styling: CSS Modules + design tokens (`variables.css` primitives + semantic tokens). Use `clsx` for className composition. Never inline styles.
- UI Library: `react-aria-components` - wrap Aria primitives in local components (e.g., `Button.tsx` wraps `Button as AriaButton`). Extend Aria props, apply CSS modules via `clsx`, accept external `className`.
- Data: Prisma 7 with PostgreSQL (dockerize on dev) (`@prisma/adapter-pg`). Generated client at `src/generated/prisma/`. Singleton in `src/lib/prisma.ts`.
- Auth: Google OAuth (SSO via Google Workspace)
- Icons: `react-icons`
- Package Manager: pnpm

## COMMANDS

- `pnpm dev` - dev server
- `pnpm build` - Prisma generate + Next build
- `pnpm lint` - ESLint
- `pnpm lint:fix` - ESLint auto-fix
- `pnpm format` - Prettier + Prisma format
- `pnpm validate` - format + lint + `tsc --noEmit`
- `pnpm test` - vitest (unit)
- `pnpm test:watch` - vitest watch
- `pnpm test:browser` - vitest with Playwright
- `pnpm storybook` - Storybook dev
- `pnpm prisma:migrate` - `prisma migrate dev`
- `pnpm prisma:generate` - `prisma generate`
- `pnpm prisma:seed` - `tsx prisma/seed.ts`
- `pnpm prisma:studio` - `prisma studio`

## CONVENTIONS

### Components

- Always scan and use existing components from `components/ ` dir.
- Interactive/browser API components: start with `"use client"`
- Co-locate in `src/components/{category}/{ComponentName}/` - component, CSS module, stories
- Wrapping Aria components pattern:
- Props: extend Aria props interface, add local variants/props, use explicit interface

### Styling

- Use only CSS custom properties from `variables.css`.
- Token system: primitives (`--raw-*`) → semantic tokens (`--color-*`, `--space-*`, etc.).
- Style exclusively via CSS Modules, imported as `styles` and composed with `clsx`.
- Always apply styles via `className` using CSS Modules. Never use inline styles or global element selectors.
- Structure your CSS modules to reflect the hierarchy and organization of your components or documents.
- Use nesting to group related styles, enhancing maintainability and clarity.
- Accept and forward external `className` props for overrides.
- Use only semantic tokens from `variables.css`; no hardcoded values.
- All styles must be scoped to classnames in CSS Modules.

### Data

- Prisma schema uses `snake_case` for fields, `PascalCase` for models/enums
- Generated types at `src/generated/prisma/`
- Seed data with `@faker-js/faker`

### Structure

- `src/app/(dashboard)/` - authenticated pages (shared layout with Sidebar + Header)
- Route groups for organizational layouts

### General

- PascalCase for components and types
- camelCase for variables, functions, files (except components which are PascalCase directories)
- No default exports (named exports only)
- No comments in code unless explaining a non-obvious decision
- Descriptive interface names, explicit typing
