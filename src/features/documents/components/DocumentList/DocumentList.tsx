"use client";

import clsx from "clsx";
import { useEffect, useRef, useState } from "react";

import { ProgressCircle } from "@/components/ui/ProgressCircle/ProgressCircle";
import { DocumentListRow } from "@/features/documents/components/DocumentListRow/DocumentListRow";
import type { DocumentRow } from "@/features/documents/queries";
import { toastError } from "@/lib/hooks/toast-utils";

import styles from "./DocumentList.module.css";

interface DocumentListProps {
  documents: DocumentRow[];
  isBusy: boolean;
  isLoading?: boolean;
  showSize?: boolean;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  className?: string;
  onDelete?: (documentId: string) => void;
  onDownload?: (document: DocumentRow) => void | Promise<void>;
  onView?: (document: DocumentRow) => void;
  onLoadMore?: () => void;
}

export function DocumentList({
  documents,
  isBusy,
  isLoading,
  showSize = true,
  hasMore,
  isLoadingMore,
  className,
  onDelete,
  onDownload,
  onView,
  onLoadMore,
}: DocumentListProps) {
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

  if (documents.length === 0) return null;

  return (
    <div ref={listRef} className={clsx(styles.documentList, className)}>
      {documents.map((doc) => (
        <DocumentListRow
          key={doc.id}
          document={doc}
          isBusy={isBusy}
          showSize={showSize}
          isDownloading={downloadingIds.has(doc.id)}
          onDownload={onDownload ? handleDownload : undefined}
          onView={onView}
          onDelete={onDelete}
        />
      ))}
      {hasMore && (
        <>
          <div ref={sentinelRef} className={styles.loadMoreRow} aria-hidden="true" />
          {isLoadingMore && (
            <div className={styles.loadMoreRow}>
              <ProgressCircle aria-label="Loading more attachments" />
            </div>
          )}
        </>
      )}
    </div>
  );
}
