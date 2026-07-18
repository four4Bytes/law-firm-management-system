export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { parseDeveloperEmails } = await import("@/lib/developer-emails");
  const { getUserByEmail } = await import("@/features/users/queries");
  const { createUser } = await import("@/features/users/mutations");
  const { Role } = await import("@/generated/prisma/client");

  const emails = parseDeveloperEmails();

  for (const email of emails) {
    const existing = await getUserByEmail(email);
    if (!existing) {
      await createUser(email, Role.Dev);
    }
  }

  // Cron expression to run the reminder job at minute 0 of every hour (e.g., 01:00, 02:00, …)
  const REMINDER_CRON_SCHEDULE = "0 * * * *";

  const cron = await import("node-cron");
  const { runReminderCheck } = await import("@/features/reminders/scheduler");
  cron.schedule(REMINDER_CRON_SCHEDULE, runReminderCheck, { noOverlap: true });
}
