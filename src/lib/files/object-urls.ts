/** Blob object-URL lifecycle helpers for previewing local files before upload. */

const objectUrls = new WeakMap<File, string>();

/**
 * Returns a blob object URL for a local file, creating and caching it on first
 * use. Callers must pair long-lived usage with {@link revokeObjectUrl}; object
 * URLs pin their blob in memory until revoked.
 *
 * @param file - The local file to expose to the browser.
 * @returns An object URL valid until the file is revoked.
 */
export function getObjectUrl(file: File): string {
  const cached = objectUrls.get(file);
  if (cached) return cached;

  const url = URL.createObjectURL(file);
  objectUrls.set(file, url);
  return url;
}

/**
 * Revokes and forgets the cached object URL for a file, if one exists.
 * Safe to call repeatedly for the same file.
 *
 * @param file - The file whose object URL should be released.
 */
export function revokeObjectUrl(file: File): void {
  const url = objectUrls.get(file);
  if (!url) return;
  URL.revokeObjectURL(url);
  objectUrls.delete(file);
}
