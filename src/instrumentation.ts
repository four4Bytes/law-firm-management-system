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
}
