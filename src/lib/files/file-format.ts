/** File-size and file-label presentation helpers for document attachments. */

import { getFileDescriptor, type FileCategory, type FileTypeInput } from "@/lib/files/file-types";

/**
 * Formats a byte count as a human-readable size (e.g. "1.5 MB"); `null` yields "Unknown".
 *
 * @param bytes - The byte count, or `null`.
 * @returns A human-readable size string.
 */
export function formatFileSize(bytes: number | null): string {
  if (bytes === null) return "Unknown";
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const factor = 1024;
  let unitIndex = 0;
  let size = bytes;

  while (size >= factor && unitIndex < units.length - 1) {
    size /= factor;
    unitIndex++;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

/**
 * Returns a short label for a file (e.g. "DOCX").
 *
 * @param payload - The file name and its stored MIME type.
 * @returns A short label, or an empty string when the file type is unknown, so
 *   callers can omit the label instead of rendering a placeholder.
 */
export function formatFileType(payload: FileTypeInput): string {
  return getFileDescriptor(payload).label;
}

/** Human-readable names for each file category. */
const FILE_CATEGORY_NAMES: Record<FileCategory, string> = {
  pdf: "PDF Document",
  doc: "Word Document",
  xls: "Spreadsheet",
  ppt: "Presentation",
  img: "Image",
  video: "Video",
  zip: "Archive",
  txt: "Text File",
  unknown: "File",
};

/**
 * Returns a descriptive human-readable name for a file category (e.g. "PDF Document").
 *
 * Takes an already-resolved category so callers that have a
 * {@link FileTypeDescriptor} do not re-resolve it.
 *
 * @param category - The resolved file category.
 * @returns The category's display name, or "File" for the unknown category.
 */
export function formatFileCategoryName(category: FileCategory): string {
  return FILE_CATEGORY_NAMES[category];
}

/**
 * Truncates a filename, keeping its extension intact.
 * Returns the original name if it fits within `maxLen`.
 *
 * @param name - The full filename (e.g. "my-document.pdf").
 * @param maxLen - Maximum total length before truncation (default 45).
 * @returns The truncated name (e.g. "my-docu...ment.pdf").
 */
export function truncateFilename(name: string, maxLen = 45): string {
  if (name.length <= maxLen) return name;

  const dotIndex = name.lastIndexOf(".");
  const ext = dotIndex > 0 ? name.slice(dotIndex) : "";
  const available = maxLen - 3 - ext.length;

  if (available <= 0) return name.slice(0, maxLen);

  return name.slice(0, available) + "..." + ext;
}

/** Video MIME types browsers can play inline without a transcode step. */
const PLAYABLE_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime", "video/x-m4v"]);

/**
 * Whether a video MIME type is reliably playable in browsers. Container
 * formats without broad codec support (e.g. `.avi`, `.mkv`) are uploaded and
 * stored normally but fall back to a download prompt instead of a player that
 * would silently fail.
 *
 * @param mime - The MIME type, normalized internally so casing and parameters
 *   (e.g. "video/mp4; codecs=avc1") do not affect the result.
 * @returns `true` when an inline `<video>` preview can be offered.
 */
export function isPlayableVideo(mime: string): boolean {
  const normalized = mime.split(";")[0].trim().toLowerCase();
  return PLAYABLE_VIDEO_TYPES.has(normalized);
}
