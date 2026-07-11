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

import { classifyFileType, formatFileSize, type FileCategory } from "@/lib/format";

import styles from "./FilePreviewCard.module.css";

interface FileTypeConfig {
  icon: IconType;
  label: string;
  color: string;
}

const FILE_TYPE_CONFIG: Record<FileCategory, FileTypeConfig> = {
  pdf: { icon: FaRegFilePdf, label: "PDF Document", color: "var(--raw-brick)" },
  doc: { icon: FaRegFileWord, label: "Word Document", color: "var(--raw-steel)" },
  xls: { icon: FaRegFileExcel, label: "Spreadsheet", color: "var(--raw-sage)" },
  ppt: { icon: FaRegFilePowerpoint, label: "Presentation", color: "var(--raw-orange)" },
  img: { icon: FaRegFileImage, label: "Image", color: "var(--raw-violet)" },
  zip: { icon: FaRegFileZipper, label: "Archive", color: "var(--raw-amber)" },
  txt: { icon: FaRegFileLines, label: "Text File", color: "var(--raw-gray-500)" },
  unknown: { icon: FaRegFile, label: "File", color: "var(--raw-gray-400)" },
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
  const { icon: Icon, label, color } = getFileTypeConfig(file_type);

  const dateStr = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(created_at);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div
          className={styles.iconContainer}
          style={{ "--file-icon-color": color } as React.CSSProperties}
        >
          <Icon className={styles.icon} />
        </div>
        <div className={styles.info}>
          <span className={styles.fileName}>{file_name}</span>
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
