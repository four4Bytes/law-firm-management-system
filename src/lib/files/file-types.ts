/**
 * Allowlist of file extensions permitted for document uploads, shared by the
 * client file picker and the server-side schema validation so both enforce the
 * same constraint. Add a new accepted type here and it propagates everywhere.
 */
export const ACCEPTED_FILE_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".txt",
  ".csv",
] as const;

const ACCEPTED_FILE_EXTENSION_SET = new Set<string>(
  ACCEPTED_FILE_EXTENSIONS.map((ext) => ext.toLowerCase()),
);

/**
 * Whether a filename's extension is in the accepted upload allowlist.
 * Matching is case-insensitive and uses the trailing extension as the source
 * of truth (the client-supplied MIME type is not trusted).
 *
 * @param fileName - The uploaded file name.
 * @returns `true` when the lowercased extension matches an allowed type.
 */
export function isAcceptedFileExtension(fileName: string): boolean {
  const dot = fileName.lastIndexOf(".");
  if (dot < 0) return false;
  return ACCEPTED_FILE_EXTENSION_SET.has(fileName.slice(dot).toLowerCase());
}
