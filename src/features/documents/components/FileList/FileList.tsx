"use client";

import { FaCheck, FaRegFileLines, FaXmark } from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";
import { ProgressCircle } from "@/components/ui/ProgressCircle/ProgressCircle";
import { truncateFilename } from "@/lib/file-format";

import styles from "./FileList.module.css";

export interface FileEntry {
  id: number;
  file: File;
  status: "pending" | "uploading" | "done" | "failed";
  error?: string;
}

interface FileListProps {
  entries: FileEntry[];
  isBusy: boolean;
  onRemove: (id: number) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileList({ entries, isBusy, onRemove }: FileListProps) {
  if (entries.length === 0) return null;

  return (
    <div className={styles.fileList}>
      {entries.map((entry) => (
        <div key={entry.id} className={styles.fileRow}>
          <FaRegFileLines className={styles.fileIcon} aria-hidden="true" />
          <span className={styles.fileName} title={entry.file.name}>
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
            <FaXmark
              className={styles.failedIcon}
              aria-label="Upload failed"
              title={entry.error ?? "Upload failed"}
            />
          )}
        </div>
      ))}
    </div>
  );
}
