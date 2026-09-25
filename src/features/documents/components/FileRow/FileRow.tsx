import clsx from "clsx";
import Image from "next/image";
import type { ReactNode } from "react";

import { FileIcon } from "@/features/documents/components/FileIcon/FileIcon";
import { classifyFileType, formatFileSize, truncateFilename } from "@/lib/files/file-format";

import styles from "./FileRow.module.css";

interface FileRowProps {
  fileName: string;
  fileType: string;
  fileSize?: number | null;
  previewUrl?: string | null;
  trailing?: ReactNode;
  className?: string;
}

export function FileRow({
  fileName,
  fileType,
  fileSize,
  previewUrl,
  trailing,
  className,
}: FileRowProps) {
  const showThumbnail = classifyFileType(fileType) === "img" && previewUrl;

  return (
    <div className={clsx(styles.row, className)}>
      {showThumbnail ? (
        <Image
          src={previewUrl}
          alt=""
          width={48}
          height={48}
          sizes="48px"
          unoptimized
          className={styles.thumbnail}
        />
      ) : (
        <FileIcon fileType={fileType} className={styles.icon} />
      )}
      <span className={styles.name} title={fileName}>
        {truncateFilename(fileName)}
      </span>
      {fileSize !== undefined && <span className={styles.size}>{formatFileSize(fileSize)}</span>}
      {trailing && <span className={styles.trailing}>{trailing}</span>}
    </div>
  );
}
