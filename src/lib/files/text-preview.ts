/** Pure helpers for rendering inline text/csv previews of document attachments. */

/** Maximum characters fetched from a text file before the preview is truncated. */
export const TEXT_PREVIEW_MAX_CHARS = 4000;

/** Files larger than this are not fetched for inline text preview. */
export const TEXT_PREVIEW_MAX_BYTES = 1024 * 1024;

/**
 * Whether a file is small enough to fetch for an inline text preview.
 * Oversized files are offered a download instead of a doomed transfer.
 *
 * @param bytes - The file size in bytes, or `null` when unknown.
 * @returns `true` when the file is within the inline preview size limit.
 */
export function canPreviewTextInline(bytes: number | null): boolean {
  if (bytes === null) return true;
  return bytes <= TEXT_PREVIEW_MAX_BYTES;
}

/**
 * Truncates text to a character budget, appending an ellipsis when content
 * was dropped so the UI never implies a complete document.
 *
 * @param text - The full text content.
 * @param maxChars - Maximum characters to keep (defaults to 4,000).
 * @returns The sliced text, suffixed with `…` when truncated.
 */
export function sliceTextPreview(text: string, maxChars = TEXT_PREVIEW_MAX_CHARS): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars).trimEnd()}…`;
}
