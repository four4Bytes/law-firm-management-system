export function parseDeveloperEmails(): string[] {
  const raw = process.env.DEVELOPER_EMAILS ?? "";
  if (raw === "") return [];

  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return Array.from(new Set(parts));
}
