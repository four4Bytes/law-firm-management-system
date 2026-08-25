"use client";

import { useState } from "react";
import { FaCheck, FaDownload, FaEye, FaRegFileLines, FaXmark } from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";
import { ProgressCircle } from "@/components/ui/ProgressCircle/ProgressCircle";
import type { DocumentRow } from "@/features/documents/queries";
import { formatFileSize, truncateFilename } from "@/lib/file-format";

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
  existingDocuments?: DocumentRow[];
  onDelete?: (documentId: string) => void;
  onDownload?: (document: DocumentRow) => void | Promise<void>;
  onView?: (document: DocumentRow) => void;
  isLoading?: boolean;
  showSize?: boolean;
}

export function FileList({
  entries,
  isBusy,
  onRemove,
  existingDocuments,
  onDelete,
  onDownload,
  onView,
  isLoading,
  showSize = true,
}: FileListProps) {
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());

  async function handleDownload(doc: DocumentRow) {
    if (!onDownload) return;
    setDownloadingIds((prev) => new Set(prev).add(doc.id));
    try {
      await onDownload(doc);
    } finally {
      setDownloadingIds((prev) => {
        const next = new Set(prev);
        next.delete(doc.id);
        return next;
      });
    }
  }

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <ProgressCircle aria-label="Loading attachments" />
      </div>
    );
  }

  if (entries.length === 0 && (!existingDocuments || existingDocuments.length === 0)) return null;

  return (
    <div className={styles.fileList}>
      {existingDocuments?.map((doc) => (
        <div key={doc.id} className={styles.fileRow}>
          <FaRegFileLines className={styles.fileIcon} aria-hidden="true" />
          <span className={styles.fileName} aria-label={doc.file_name}>
            {truncateFilename(doc.file_name)}
          </span>
          {showSize && <span className={styles.fileSize}>{formatFileSize(doc.file_size)}</span>}

          {onView && (
            <Button
              variant="ghost"
              className={styles.removeButton}
              aria-label={`View ${doc.file_name}`}
              isDisabled={isBusy}
              onPress={() => onView(doc)}
            >
              <FaEye />
            </Button>
          )}

          {onDownload && (
            <Button
              variant="ghost"
              className={styles.removeButton}
              aria-label={`Download ${doc.file_name}`}
              isDisabled={isBusy}
              isPending={downloadingIds.has(doc.id)}
              onPress={() => handleDownload(doc)}
            >
              <FaDownload />
            </Button>
          )}

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
          {showSize && <span className={styles.fileSize}>{formatFileSize(entry.file.size)}</span>}

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
