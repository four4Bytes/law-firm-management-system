/** Client- and server-shared policy for which files may be uploaded as documents. */

/** Default maximum upload size: 500 MB. Override with `NEXT_PUBLIC_APP_MAX_UPLOAD_BYTES`. */
export const DEFAULT_MAX_UPLOAD_BYTES = 500 * 1024 * 1024;

/**
 * Resolves the maximum permitted upload size in bytes.
 *
 * Both server and browser read `NEXT_PUBLIC_APP_MAX_UPLOAD_BYTES`, which Next.js
 * inlines in browser bundles. The default applies when it is not configured.
 *
 * @returns The maximum upload size in bytes.
 */
export function getAppMaxUploadBytes(): number {
  const value = process.env.NEXT_PUBLIC_APP_MAX_UPLOAD_BYTES;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_UPLOAD_BYTES;
}

/**
 * Whether a file is within the configured upload size limit.
 *
 * @param bytes - The file size in bytes.
 * @returns `true` when the file may be uploaded.
 */
export function isWithinUploadSizeLimit(bytes: number): boolean {
  return bytes <= getAppMaxUploadBytes();
}

/** Stable identity for a file, used to detect files queued more than once. */
function fileKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

/**
 * Finds incoming files already present in the queue, so re-selecting or
 * re-dropping the same file is reported instead of silently queued twice.
 *
 * @param incoming - Files the user just added.
 * @param queued - Files already awaiting upload.
 * @returns The incoming files that duplicate a queued file.
 */
export function findDuplicateFiles(incoming: File[], queued: File[]): File[] {
  const queuedKeys = new Set(queued.map(fileKey));
  const seenIncoming = new Set<string>();
  const duplicates: File[] = [];

  for (const file of incoming) {
    const key = fileKey(file);
    if (queuedKeys.has(key) || seenIncoming.has(key)) {
      duplicates.push(file);
    }
    seenIncoming.add(key);
  }

  return duplicates;
}
