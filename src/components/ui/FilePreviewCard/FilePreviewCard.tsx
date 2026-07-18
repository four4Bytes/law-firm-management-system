"use client";

import {
  FaRegFile,
  FaRegFileExcel,
  FaRegFileImage,
  FaRegFileLines,
  FaRegFilePdf,
  FaRegFilePowerpoint,
  FaRegFileWord,
  FaRegFileZipper,
} from "react-icons/fa6";
import type { IconType } from "react-icons/lib";

import {
  classifyFileType,
  formatFileSize,
  truncateFilename,
  type FileCategory,
} from "@/lib/file-format";

import styles from "./FilePreviewCard.module.css";

interface FileTypeConfig {
  icon: IconType;
  label: string;
}

const FILE_TYPE_CONFIG: Record<FileCategory, FileTypeConfig> = {
  pdf: { icon: FaRegFilePdf, label: "PDF Document" },
  doc: { icon: FaRegFileWord, label: "Word Document" },
  xls: { icon: FaRegFileExcel, label: "Spreadsheet" },
  ppt: { icon: FaRegFilePowerpoint, label: "Presentation" },
  img: { icon: FaRegFileImage, label: "Image" },
  zip: { icon: FaRegFileZipper, label: "Archive" },
  txt: { icon: FaRegFileLines, label: "Text File" },
  unknown: { icon: FaRegFile, label: "File" },
};

function getFileTypeConfig(fileType: string): FileTypeConfig {
  return FILE_TYPE_CONFIG[classifyFileType(fileType)];
}

interface FilePreviewCardProps {
  file_name: string;
  file_type: string;
  file_size: number | null;
  uploadedBy: string;
  created_at: Date;
}

export function FilePreviewCard({
  file_name,
  file_type,
  file_size,
  uploadedBy,
  created_at,
}: FilePreviewCardProps) {
  const { icon: Icon, label } = getFileTypeConfig(file_type);
  const fileCategory = classifyFileType(file_type);

  const dateStr = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(created_at);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.iconContainer} data-category={fileCategory}>
          <Icon className={styles.icon} />
        </div>
        <div className={styles.info}>
          <span className={styles.fileName} aria-label={file_name}>
            {truncateFilename(file_name)}
          </span>
          <div className={styles.meta}>
            <span>{label}</span>
            <span className={styles.separator} aria-hidden="true">
              ·
            </span>
            <span>{formatFileSize(file_size)}</span>
          </div>
        </div>
      </div>
      <div className={styles.footer}>
        <span>Uploaded by {uploadedBy}</span>
        <span className={styles.separator} aria-hidden="true">
          ·
        </span>
        <span>{dateStr}</span>
      </div>
    </div>
  );
}
