/**
 * Manually triggers the reminder scheduler outside of cron.
 *
 * All inputs come from env (no CLI args) so it mirrors production:
 * - DATABASE_URL (required) via `src/lib/prisma`
 * - APP_TIMEZONE / NEXT_PUBLIC_APP_TIMEZONE → `getAppTimeZone()` (defaults to Asia/Manila for PH; set to any IANA zone for worldwide)
 * - NOTIFICATION_RETENTION_DAYS → prune cutoff (defaults to 90)
 *
 * Usage:
 *   pnpm exec tsx scripts/run-reminders.ts
 *   APP_TIMEZONE=America/New_York pnpm exec tsx scripts/run-reminders.ts
 *   NOTIFICATION_RETENTION_DAYS=7 pnpm exec tsx scripts/run-reminders.ts
 *
 * Or via HTTP (tests real auth):
 *   curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/reminders
 */
import "dotenv/config";

import { getAppTimeZone } from "@/lib/date";
import { getOptionalInteger } from "@/lib/env";

async function main(): Promise<void> {
  const timeZone = getAppTimeZone();
  const retentionDays = getOptionalInteger("NOTIFICATION_RETENTION_DAYS", 90);
  const now = new Date();

  console.log(
    `[reminders] timezone=${timeZone} retentionDays=${retentionDays} now=${now.toISOString()}`,
  );

  if (!process.env.DATABASE_URL) {
    console.error("[reminders] DATABASE_URL is not set — check .env");
    process.exit(1);
  }

  try {
    const { runReminderCheck } = await import("@/features/reminders/scheduler");
    await runReminderCheck();
    console.log("[reminders] done");
  } catch (err) {
    console.error("[reminders] failed:", err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[reminders] unhandled error:", err);
  process.exit(1);
});
