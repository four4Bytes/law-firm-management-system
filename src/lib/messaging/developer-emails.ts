/** Parses and checks the `DEVELOPER_EMAILS` allowlist used to gate privileged accounts. */

/**
 * Parses the comma-separated `DEVELOPER_EMAILS` env var into a de-duplicated list.
 *
 * @returns A de-duplicated array of email addresses (empty if unset).
 */
export function parseDeveloperEmails(): string[] {
  const raw = process.env.DEVELOPER_EMAILS ?? "";
  if (raw === "") return [];

  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return Array.from(new Set(parts));
}

/**
 * Returns whether the given email is in the developer allowlist.
 *
 * @param email - The email to check.
 * @returns True if the email is in the developer allowlist.
 */
export function isDeveloperEmail(email: string): boolean {
  return parseDeveloperEmails().includes(email);
}
