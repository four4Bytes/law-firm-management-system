"use client";

import { useEffect, useRef, useState } from "react";
import { FaCheck, FaDownload, FaEye, FaRegFileLines, FaXmark } from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";
import { ProgressCircle } from "@/components/ui/ProgressCircle/ProgressCircle";
import { Tooltip, TooltipTrigger } from "@/components/ui/Tooltip/Tooltip";
import type { DocumentRow } from "@/features/documents/queries";
import { formatFileSize, truncateFilename } from "@/lib/file-format";
import { toastError } from "@/lib/toast-utils";
import type { FileEntry } from "@/lib/useFileUpload";

import styles from "./FileList.module.css";

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
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
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
  hasMore,
  isLoadingMore,
  onLoadMore,
}: FileListProps) {
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  const listRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || !onLoadMore) return;
    const list = listRef.current;
    const sentinel = sentinelRef.current;
    if (!list || !sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) onLoadMore();
      },
      { root: list },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore]);

  async function handleDownload(doc: DocumentRow) {
    if (!onDownload) return;
    setDownloadingIds((prev) => new Set(prev).add(doc.id));
    try {
      await onDownload(doc);
    } catch {
      toastError(
        "Failed to download file",
        `Could not download "${doc.file_name}". Please try again.`,
      );
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
    <div ref={listRef} className={styles.fileList}>
      {existingDocuments?.map((doc) => (
        <div key={doc.id} className={styles.fileRow}>
          <FaRegFileLines className={styles.fileIcon} aria-hidden="true" />
          <span className={styles.fileName} aria-label={doc.file_name}>
            {truncateFilename(doc.file_name)}
          </span>
          {showSize && <span className={styles.fileSize}>{formatFileSize(doc.file_size)}</span>}

          {onView && (
            <TooltipTrigger>
              <Button
                variant="ghost"
                className={styles.removeButton}
                aria-label={`View ${doc.file_name}`}
                isDisabled={isBusy}
                onPress={() => onView(doc)}
              >
                <FaEye />
              </Button>
              <Tooltip>{`View ${doc.file_name}`}</Tooltip>
            </TooltipTrigger>
          )}

          {onDownload && (
            <TooltipTrigger>
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
              <Tooltip>{`Download ${doc.file_name}`}</Tooltip>
            </TooltipTrigger>
          )}

          {onDelete && (
            <TooltipTrigger>
              <Button
                variant="ghost"
                className={styles.removeButton}
                aria-label={`Delete ${doc.file_name}`}
                isDisabled={isBusy}
                onPress={() => onDelete(doc.id)}
              >
                <FaXmark />
              </Button>
              <Tooltip>{`Delete ${doc.file_name}`}</Tooltip>
            </TooltipTrigger>
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
            <TooltipTrigger>
              <Button
                variant="ghost"
                className={styles.removeButton}
                aria-label={`Remove ${entry.file.name}`}
                isDisabled={isBusy}
                onPress={() => onRemove(entry.id)}
              >
                <FaXmark />
              </Button>
              <Tooltip>{`Remove ${entry.file.name}`}</Tooltip>
            </TooltipTrigger>
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
      {hasMore && (
        <div ref={sentinelRef} className={styles.loadMoreRow} aria-hidden="true">
          {isLoadingMore && <ProgressCircle aria-label="Loading more attachments" />}
        </div>
      )}
    </div>
  );
}
