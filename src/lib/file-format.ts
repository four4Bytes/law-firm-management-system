/** File-size and MIME-type presentation helpers for document attachments. */

/**
 * Formats a byte count as a human-readable size (e.g. "1.5 MB"); `null` yields "Unknown".
 *
 * @param bytes - The byte count, or `null`/`undefined`.
 * @returns A human-readable size string.
 */
export function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return "Unknown";
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

/** Coarse classification of a MIME type into a display category. */
export type FileCategory = "pdf" | "doc" | "xls" | "ppt" | "img" | "zip" | "txt" | "unknown";

/**
 * Maps a MIME type string to its {@link FileCategory}.
 *
 * @param fileType - The MIME type string (e.g. "application/pdf").
 * @returns The matching file category.
 */
export function classifyFileType(fileType: string): FileCategory {
  const type = fileType.toLowerCase();

  if (type.includes("pdf")) return "pdf";
  if (
    type.includes("excel") ||
    type.includes("spreadsheet") ||
    type.includes("sheet") ||
    type.includes("xls")
  )
    return "xls";
  if (type.includes("presentation") || type.includes("ppt")) return "ppt";
  if (type.includes("word") || type.includes("document") || type.includes("doc")) return "doc";
  if (
    type.includes("image") ||
    type.includes("png") ||
    type.includes("jpg") ||
    type.includes("jpeg") ||
    type.includes("gif")
  )
    return "img";
  if (
    type.includes("zip") ||
    type.includes("rar") ||
    type.includes("tar") ||
    type.includes("gz") ||
    type.includes("archive")
  )
    return "zip";
  if (type.includes("text") || type.includes("csv")) return "txt";

  return "unknown";
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

/** Display labels for each {@link FileCategory}. */
const FILE_TYPE_LABELS: Record<FileCategory, string> = {
  pdf: "PDF",
  doc: "DOCX",
  xls: "XLSX",
  ppt: "PPT",
  img: "IMG",
  zip: "ZIP",
  txt: "TXT",
  unknown: "",
};

/**
 * Returns a short human-readable label for a MIME type (e.g. "PDF", "XLSX").
 *
 * @param fileType - The MIME type string.
 * @returns A short label, or the fallback suffix if unknown.
 */
export function formatFileType(fileType: string): string {
  const category = classifyFileType(fileType);
  const label = FILE_TYPE_LABELS[category];
  if (label) return label;
  return fileType.split("/").pop()?.toUpperCase() ?? fileType;
}
