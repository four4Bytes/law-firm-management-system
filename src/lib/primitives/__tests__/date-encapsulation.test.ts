import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

const SRC_ROOT = join(process.cwd(), "src");

/** The only module permitted to derive a timezone implicitly. */
const DATE_MODULE = "src/lib/primitives/date.ts";

/**
 * `Date.prototype` field readers resolve against the *runtime's* zone - the
 * browser's on the client, the host's (usually UTC) on a deployed server. Any
 * use outside the date module silently disagrees with the app timezone, which
 * has produced off-by-one-day bugs that only appear in production.
 */
const BANNED_DATE_READERS = [
  "getFullYear",
  "getMonth",
  "getDate",
  "getHours",
  "getMinutes",
  "getSeconds",
  "getDay",
  "getTimezoneOffset",
];

/** Reads the browser's zone; use the app timezone helpers instead. */
const BANNED_ZONE_READERS = ["getLocalTimeZone"];

/**
 * `getAppTimeZone()` is deliberately still importable - `node-cron`'s
 * `timezone` option and `CalendarDate.toDate(zone)` both demand an explicit
 * zone. The invariant is that a caller *names* the app zone rather than letting
 * a runtime guess one, so this list is not exhaustive and new deliberate
 * call sites are expected as external APIs are adopted.
 */
const ALLOWED_ZONE_CALLERS = [
  "src/instrumentation.ts",
  "src/lib/validation/form-utils.ts",
  "src/features/notifications/mutations.ts",
  "src/features/reminders/scheduler.ts",
];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.tsx?$/.test(entry) ? [full] : [];
  });
}

/**
 * Drops comments so a TSDoc line that names a banned function to warn against
 * does not count as a call site. Not a full parser - a best-effort strip is
 * enough because the patterns below only ever appear in code.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[^\S\n]*\/\/.*$/gm, "");
}

function findViolations(): string[] {
  const violations: string[] = [];

  for (const file of walk(SRC_ROOT)) {
    const rel = relative(process.cwd(), file);
    if (rel === DATE_MODULE) continue;
    if (/\.test\.tsx?$/.test(rel)) continue;

    const code = stripComments(readFileSync(file, "utf8"));

    for (const reader of [...BANNED_DATE_READERS, ...BANNED_ZONE_READERS]) {
      // A call or member access, not a bare mention inside an identifier.
      const pattern = new RegExp(`\\.${reader}\\s*\\(|\\b${reader}\\s*\\(`);
      if (pattern.test(code)) violations.push(`${rel}: ${reader}`);
    }

    if (!ALLOWED_ZONE_CALLERS.includes(rel) && /\bgetAppTimeZone\s*\(/.test(code)) {
      violations.push(`${rel}: getAppTimeZone`);
    }
  }

  return violations;
}

describe("app timezone encapsulation", () => {
  it("keeps every zone-sensitive Date read inside the date module", () => {
    expect(findViolations()).toEqual([]);
  });

  it("would catch a reintroduced zone leak", () => {
    // Self-check: the detector must actually detect. A guard that cannot fail
    // is worse than no guard, so prove it fires on a known-bad snippet.
    const offenders = [
      "const d = new Date(); return d.getFullYear();",
      'import { today } from "@internationalized/date";\nconst t = today(getLocalTimeZone());',
    ];
    const hits = offenders.flatMap((snippet) =>
      [...BANNED_DATE_READERS, ...BANNED_ZONE_READERS].filter((reader) =>
        new RegExp(`\\.${reader}\\s*\\(|\\b${reader}\\s*\\(`).test(snippet),
      ),
    );

    expect(hits).toContain("getFullYear");
    expect(hits).toContain("getLocalTimeZone");
  });

  it("does not flag the date module or the allow-listed zone callers", () => {
    const dateModuleCode = stripComments(readFileSync(join(SRC_ROOT, "..", DATE_MODULE), "utf8"));

    expect(findViolations()).toEqual([]);
    expect(dateModuleCode).toContain("getAppTimeZone");
    for (const caller of ALLOWED_ZONE_CALLERS) {
      expect(caller).not.toBe(DATE_MODULE);
    }
  });
});
