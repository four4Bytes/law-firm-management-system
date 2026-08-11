"use client";

import { FaCheck, FaRegFileLines, FaXmark } from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";
import { ProgressCircle } from "@/components/ui/ProgressCircle/ProgressCircle";
import { formatFileSize, truncateFilename } from "@/lib/file-format";

import styles from "./FileList.module.css";

export interface FileEntry {
  id: number;
  file: File;
  status: "pending" | "uploading" | "done" | "failed";
  error?: string;
}

interface ExistingDocument {
  id: string;
  file_name: string;
  file_size: number | null;
}

interface FileListProps {
  entries: FileEntry[];
  isBusy: boolean;
  onRemove: (id: number) => void;
  existingDocuments?: ExistingDocument[];
  onDelete?: (documentId: string) => void;
}

export function FileList({
  entries,
  isBusy,
  onRemove,
  existingDocuments,
  onDelete,
}: FileListProps) {
  if (entries.length === 0 && (!existingDocuments || existingDocuments.length === 0)) return null;

  return (
    <div className={styles.fileList}>
      {existingDocuments?.map((doc) => (
        <div key={doc.id} className={styles.fileRow}>
          <FaRegFileLines className={styles.fileIcon} aria-hidden="true" />
          <span className={styles.fileName} aria-label={doc.file_name}>
            {truncateFilename(doc.file_name)}
          </span>
          <span className={styles.fileSize}>{formatFileSize(doc.file_size)}</span>

          {onDelete && (
            <Button
              variant="ghost"
              className={styles.removeButton}
              aria-label={`Delete ${doc.file_name}`}
              isDisabled={isBusy}
              onPress={() => onDelete(doc.id)}
            >
              <FaXmark />
            </Button>
          )}
        </div>
      ))}

      {entries.map((entry) => (
        <div key={entry.id} className={styles.fileRow}>
          <FaRegFileLines className={styles.fileIcon} aria-hidden="true" />
          <span className={styles.fileName} aria-label={entry.file.name}>
            {truncateFilename(entry.file.name)}
          </span>
          <span className={styles.fileSize}>{formatFileSize(entry.file.size)}</span>

          {entry.status === "pending" && (
            <Button
              variant="ghost"
              className={styles.removeButton}
              aria-label={`Remove ${entry.file.name}`}
              isDisabled={isBusy}
              onPress={() => onRemove(entry.id)}
            >
              <FaXmark />
            </Button>
          )}

          {entry.status === "uploading" && (
            <ProgressCircle aria-label={`Uploading ${entry.file.name}`} />
          )}

          {entry.status === "done" && <FaCheck className={styles.doneIcon} aria-label="Uploaded" />}

          {entry.status === "failed" && (
            <FaXmark className={styles.failedIcon} aria-label={entry.error ?? "Upload failed"} />
          )}
        </div>
      ))}
    </div>
  );
}
