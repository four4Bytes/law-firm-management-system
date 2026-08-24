import { deleteFile } from "@/lib/s3";

/**
 * Deletes the S3 objects backing a set of document files.
 *
 * Used when a parent entity (case, consultation, or task) is removed so its
 * attached document blobs are purged alongside the cascade-deleted `Document`
 * rows. The call hard-fails: the first rejected `deleteFile` propagates,
 * aborting the surrounding delete so neither a dangling DB row nor a leaked
 * object is left behind. `DeleteObject` is idempotent, so a retry after a
 * partial failure safely re-attempts already-removed keys.
 *
 * @param filePaths - The S3 object keys (stored as `Document.file_path`) to remove.
 */
export async function deleteDocumentFiles(filePaths: string[]): Promise<void> {
  for (const filePath of filePaths) {
    await deleteFile(filePath);
  }
}
