import clsx from "clsx";
import Image from "next/image";
import type { ReactNode } from "react";

import { FileIcon } from "@/features/documents/components/FileIcon/FileIcon";
import { formatFileSize, truncateFilename } from "@/lib/files/file-format";
import { getFileDescriptor, type FileTypeInput } from "@/lib/files/file-types";

import styles from "./FileRow.module.css";

interface FileRowProps extends FileTypeInput {
  /** Byte count; omit to hide the size, pass `null` to show it as "Unknown". */
  fileSize?: number | null;
  showFileType?: boolean;
  previewUrl?: string | null;
  trailing?: ReactNode;
  className?: string;
}

export function FileRow({
  fileName,
  fileType,
  fileSize,
  showFileType = true,
  previewUrl,
  trailing,
  className,
}: FileRowProps) {
  const { category, label } = getFileDescriptor({ fileName, fileType });
  const thumbnail = category === "img" ? previewUrl : null;

  return (
    <div className={clsx(styles.row, className)}>
      {thumbnail ? (
        <Image
          src={thumbnail}
          alt=""
          width={48}
          height={48}
          sizes="48px"
          unoptimized
          className={styles.thumbnail}
        />
      ) : (
        <FileIcon category={category} className={styles.icon} />
      )}
      <span className={styles.name} title={fileName}>
        {truncateFilename(fileName)}
      </span>
      {showFileType && label && <span className={styles.type}>{label}</span>}
      {fileSize !== undefined && <span className={styles.size}>{formatFileSize(fileSize)}</span>}
      {trailing && <span className={styles.trailing}>{trailing}</span>}
    </div>
  );
}
