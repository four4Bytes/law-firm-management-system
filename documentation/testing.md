# Testing Guide

Conventions for the test suite (`AGENTS.md` holds the normative rules; this doc shows how to apply them).

## Layout

- Tests live in `__tests__/` next to the code they cover: `src/features/users/__tests__/queries.test.ts`.
- `*.test.ts` for logic, `*.test.tsx` for components.
- Shared helpers live in `src/test-utils/` (`fixtures.ts` for rows, `test-setup.ts` for auth). That directory is matched by no test glob and is exempt from the `src/lib/` TSDoc rule.

## Structure

One `describe` per exported unit, one `it` per behavior:

```ts
describe("deactivateUserAction", () => {
  it("returns an error when deactivating the last active Admin/Dev", ...)
  it("deactivates a regular user successfully", ...)
});
```

When only the inputs vary but the behavior is identical, collapse with `it.each` instead of copying the body:

```ts
it.each([
  { role: "Paralegal", field: "case.create" },
  { role: "ProcessServer", field: "case.create" },
])("denies $field for $role", async ({ role, field }) => { ... });
```

## Fixtures first

Never define local row factories. Build rows from `src/test-utils/fixtures.ts`, typed off the Prisma models:

```ts
import { mockUser } from "@/test-utils/fixtures";

vi.mocked(prisma.user.findMany).mockResolvedValue([
  mockUser({ id: "u1", name: "Alice", last_seen_at: recentDate }),
]);
```

Relational (query-result) shapes rebase on the shared row via spread:

```ts
const mockCase = (overrides: Record<string, unknown> = {}) => ({
  ...mockBaseCase(),
  client: { name: "Alice Client" },
  caseAssignments: [{ user: { name: "Bob Lawyer" } }],
  ...overrides,
});
```

Override defaults in the wrapper only when a test depends on the value (e.g. a test asserting `entity_id: "550e8400-..."` keeps that default explicitly). When shared defaults change, the suite tells you which expectations were coupled to them — update the expectation, not the fixture.

## Sessions

Set auth state only via `setupAuth(...)` or `setupAuthError(...)`. Never inline session literals per
test:

```ts
import { mockSessionUser } from "@/test-utils/fixtures";
import { setupAuth, setupAuthError } from "@/test-utils/test-setup";

it("returns an error when unauthorized", async () => {
  setupAuthError(new UnauthorizedError());
  ...
});

it("updates the session user's last seen timestamp", async () => {
  const session = setupAuth();
  ...
  expect(updateUserLastSeen).toHaveBeenCalledWith(session.id);
});
```

`vi.mock("@/lib/auth-guards", ...)` stays per file — Vitest hoists `vi.mock` above imports, so the declaration cannot be centralized. Only the rows and the setup calls are shared. `setupAuth` tolerates files that mock `requireAuth` alone (it drives `requirePermission` only when the mock provides it).

## Mocking Prisma

```ts
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: vi.fn(), findMany: vi.fn() } },
}));
```

Declare only the methods the file exercises. Reset in `beforeEach` (`vi.clearAllMocks()`); file-specific stub defaults (e.g. `findMany → []`) stay in the test file next to the behavior they support.

## Assertions

- Prefer exact `toEqual` shapes for mapped rows — they pin the query contract.
- `toMatchObject` is acceptable for passthrough reads (e.g. `getNoteById`) where the query selects a subset.
- Never assert mock call order unless ordering is the contract. Assert outcomes: return values and the enlisted side effects.
- No `as any`, no `as never`, no `Record<string, unknown>` wrappers around rows. If a mock doesn't typecheck, suspect the query boundary first: a leaking non-plain type (e.g. `Decimal` instead of `number`) is a production bug, not a test problem. Fix the query so the mock can be truthful.

## Timers

Scope fake timers to the test that needs them:

```ts
it("boundary is offline", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  try {
    ...
  } finally {
    vi.useRealTimers();
  }
});
```

Never file-global timer state (`afterEach(useRealTimers)` to clean up someone else's fakes is a smell — scope the fakes instead).

## What not to test

Re-exports, framework behavior, and one-line pass-throughs. Every `it` must assert a distinct behavior — a test that can only fail if Vitest itself breaks is coverage theater.
