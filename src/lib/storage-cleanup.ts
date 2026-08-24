import { deleteFile } from "@/lib/s3";

/**
 * Best-effort deletion of the S3 objects backing a set of document files.
 *
 * Used as cleanup after a parent entity (case, consultation, or task) is
 * deleted, so its attached document blobs are reclaimed alongside the
 * cascade-deleted `Document` rows. The database is the source of truth: the
 * rows are removed first and this is invoked only to tidy storage, so a failed
 * `deleteFile` must never abort the surrounding delete. Each key is attempted
 * independently; failures are logged and swallowed (the call still resolves)
 * because `DeleteObject` is idempotent and any object left behind is a
 * harmless orphan reclaimed later by the storage GC sweep.
 *
 * @param filePaths - The S3 object keys (stored as `Document.file_path`) to remove.
 */
export async function deleteDocumentFiles(filePaths: string[]): Promise<void> {
  const failures: string[] = [];

  for (const filePath of filePaths) {
    try {
      await deleteFile(filePath);
    } catch (error) {
      failures.push(filePath);
      console.error(`Failed to delete document file "${filePath}":`, error);
    }
  }

  if (failures.length > 0) {
    console.error(
      `Storage cleanup left ${failures.length} undeleted object(s): ${failures.join(", ")}`,
    );
  }
}
