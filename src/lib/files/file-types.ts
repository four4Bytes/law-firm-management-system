/**
 * Catalogue of the file types the app accepts, and the rules that turn a stored
 * `Document` row into something the UI can present.
 *
 * The extension is what the upload allowlist gates on and what the upload path
 * derives the type from, so resolution is extension-first. The stored MIME type
 * is only consulted for extensions the registry does not cover, such as the
 * seeded `.zip` evidence bundle.
 */

/** Coarse classification of a file into a display category. */
export type FileCategory =
  "pdf" | "doc" | "xls" | "ppt" | "img" | "video" | "zip" | "txt" | "unknown";

/** Everything the UI needs to describe a file, resolved in one pass. */
export interface FileTypeDescriptor {
  /** Coarse category driving the icon and preview strategy. */
  category: FileCategory;
  /** Short display label (e.g. "DOCX"); empty when nothing meaningful is known. */
  label: string;
  /**
   * MIME type served to browsers. For allowlisted files this is a hint inferred
   * from the extension, not a type verified against the file's contents.
   */
  mime: string;
}

/** A file identified well enough to resolve a {@link FileTypeDescriptor}. */
export interface FileTypeInput {
  /** File name; its extension is the authoritative signal when it is allowlisted. */
  fileName: string;
  /** Stored MIME type, consulted only when the extension is not allowlisted. */
  fileType?: string;
}

/**
 * Presentation metadata for every accepted upload, keyed by lowercased extension
 * without the leading dot. The upload allowlist below is derived from these keys,
 * so an extension cannot be accepted without a category, label, and MIME type.
 *
 * Each MIME type is a hint inferred from the extension, not verified against the
 * file's bytes — the trust boundary the upload allowlist already applies. Treat
 * the entries as immutable; {@link getFileDescriptor} copies before returning.
 */
const FILE_TYPE_REGISTRY: Readonly<Record<string, FileTypeDescriptor>> = {
  pdf: { category: "pdf", label: "PDF", mime: "application/pdf" },
  doc: { category: "doc", label: "DOC", mime: "application/msword" },
  docx: {
    category: "doc",
    label: "DOCX",
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
  xls: { category: "xls", label: "XLS", mime: "application/vnd.ms-excel" },
  xlsx: {
    category: "xls",
    label: "XLSX",
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  },
  png: { category: "img", label: "PNG", mime: "image/png" },
  jpg: { category: "img", label: "JPG", mime: "image/jpeg" },
  jpeg: { category: "img", label: "JPEG", mime: "image/jpeg" },
  gif: { category: "img", label: "GIF", mime: "image/gif" },
  txt: { category: "txt", label: "TXT", mime: "text/plain" },
  csv: { category: "txt", label: "CSV", mime: "text/csv" },
  mp4: { category: "video", label: "MP4", mime: "video/mp4" },
  mov: { category: "video", label: "MOV", mime: "video/quicktime" },
  m4v: { category: "video", label: "M4V", mime: "video/x-m4v" },
  webm: { category: "video", label: "WEBM", mime: "video/webm" },
  avi: { category: "video", label: "AVI", mime: "video/x-msvideo" },
  mkv: { category: "video", label: "MKV", mime: "video/x-matroska" },
};

/** Descriptor for files the registry does not cover. */
const UNKNOWN_FILE_TYPE: FileTypeDescriptor = {
  category: "unknown",
  label: "",
  mime: "application/octet-stream",
};

/** MIME types that carry no information, so they are treated as absent. */
const UNINFORMATIVE_MIME_TYPES = new Set([
  "application/octet-stream",
  "binary/octet-stream",
  "application/x-empty",
]);

/**
 * Coarse labels for the MIME fallback path, used only when a file's extension
 * is not in {@link FILE_TYPE_REGISTRY}. The registry's per-extension labels are
 * more precise, so these stay generic.
 */
const CATEGORY_FALLBACK_LABELS: Record<FileCategory, string> = {
  pdf: "PDF",
  doc: "DOC",
  xls: "XLS",
  ppt: "PPT",
  img: "IMG",
  video: "VIDEO",
  zip: "ZIP",
  txt: "TXT",
  unknown: "",
};

/**
 * Substring classifier for MIME types outside the registry. Order is
 * significant: OpenXML Word and Excel types both contain "document", so the
 * spreadsheet branches must be tested first.
 *
 * @param mime - The MIME type to classify.
 * @returns The matching category, or "unknown".
 */
function classifyMimeType(mime: string): FileCategory {
  const type = mime.toLowerCase();

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
    type.includes("video") ||
    type.includes("mpeg") ||
    type.includes("mp4") ||
    type.includes("webm")
  )
    return "video";
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
 * Extracts the lowercased trailing extension of a file name, without the dot.
 *
 * @param fileName - The file name (e.g. "Deed.PDF").
 * @returns The extension (e.g. "pdf"), or an empty string when there is none.
 */
export function getFileExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex < 0 || dotIndex === fileName.length - 1) return "";
  return fileName.slice(dotIndex + 1).toLowerCase();
}

/**
 * Resolves a stored MIME type down to a bare, comparable value, discarding
 * parameters and casing. Uninformative types become an empty string so callers
 * treat them as absent.
 *
 * @param fileType - The raw stored MIME type.
 * @returns A normalized MIME type, or an empty string when uninformative.
 */
function normalizeMimeType(fileType: string): string {
  const mime = fileType.split(";")[0].trim().toLowerCase();
  return UNINFORMATIVE_MIME_TYPES.has(mime) ? "" : mime;
}

/**
 * Describes a file from its name and stored MIME type. The extension wins
 * whenever it is allowlisted. The result is a copy, so callers cannot mutate the
 * registry through it.
 *
 * @param payload - The file name and its stored MIME type.
 * @returns The resolved descriptor, or a generic one when neither signal is
 *   informative.
 */
export function getFileDescriptor(payload: FileTypeInput): FileTypeDescriptor {
  const { fileName, fileType } = payload;

  // Own-property check: an extension like "constructor" or "toString" would
  // otherwise resolve to something on Object.prototype and yield a descriptor
  // with no category.
  const extension = getFileExtension(fileName);
  if (Object.hasOwn(FILE_TYPE_REGISTRY, extension)) {
    return { ...FILE_TYPE_REGISTRY[extension] };
  }

  const mime = fileType ? normalizeMimeType(fileType) : "";
  if (!mime) return { ...UNKNOWN_FILE_TYPE };

  const category = classifyMimeType(mime);
  return { category, label: CATEGORY_FALLBACK_LABELS[category], mime };
}

/**
 * Maps a file to its {@link FileCategory}.
 *
 * @param payload - The file name and its stored MIME type.
 * @returns The matching file category.
 */
export function classifyFileType(payload: FileTypeInput): FileCategory {
  return getFileDescriptor(payload).category;
}

/**
 * Whether a file selected in the browser is an image, using the same
 * extension-first resolution as stored documents. The browser's reported type is
 * unreliable for local files, so its name carries the answer.
 *
 * @param file - The file's name and browser-reported type.
 * @returns `true` when the file can be previewed as an image.
 */
export function isImageFile(file: Pick<File, "name" | "type">): boolean {
  return classifyFileType({ fileName: file.name, fileType: file.type }) === "img";
}

/**
 * Allowlist of file extensions permitted for document uploads, shared by the
 * client file picker and the server-side schema validation so both enforce the
 * same constraint. Add a new accepted type to the registry and it propagates
 * everywhere.
 */
export const ACCEPTED_FILE_EXTENSIONS: readonly string[] = Object.keys(FILE_TYPE_REGISTRY).map(
  (extension) => `.${extension}`,
);

const ACCEPTED_FILE_EXTENSION_SET = new Set<string>(ACCEPTED_FILE_EXTENSIONS);

/**
 * Whether a filename's extension is in the accepted upload allowlist.
 * Matching is case-insensitive and uses the trailing extension as the source
 * of truth (the client-supplied MIME type is not trusted).
 *
 * @param fileName - The uploaded file name.
 * @returns `true` when the lowercased extension matches an allowed type.
 */
export function isAcceptedFileExtension(fileName: string): boolean {
  return ACCEPTED_FILE_EXTENSION_SET.has(`.${getFileExtension(fileName)}`);
}
