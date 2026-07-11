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

export type FileCategory = "pdf" | "doc" | "xls" | "ppt" | "img" | "zip" | "txt" | "unknown";

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

export function formatFileType(fileType: string): string {
  const category = classifyFileType(fileType);
  const label = FILE_TYPE_LABELS[category];
  if (label) return label;
  return fileType.split("/").pop()?.toUpperCase() ?? fileType;
}
