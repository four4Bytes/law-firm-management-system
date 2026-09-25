"use client";

import clsx from "clsx";

import { UploadQueueRow } from "@/features/documents/components/UploadQueueRow/UploadQueueRow";
import type { FileEntry } from "@/lib/hooks/useFileUpload";

import styles from "./UploadQueue.module.css";

interface UploadQueueProps {
  entries: FileEntry[];
  isBusy: boolean;
  className?: string;
  onRemove: (id: number) => void;
  getPreviewUrl?: (entry: FileEntry) => string | null;
}

export function UploadQueue({
  entries,
  isBusy,
  className,
  onRemove,
  getPreviewUrl,
}: UploadQueueProps) {
  if (entries.length === 0) return null;

  return (
    <ul className={clsx(styles.uploadQueue, className)} aria-label="Files queued for upload">
      {entries.map((entry) => (
        <li key={entry.id}>
          <UploadQueueRow
            entry={entry}
            previewUrl={getPreviewUrl?.(entry) ?? null}
            isBusy={isBusy}
            onRemove={onRemove}
          />
        </li>
      ))}
    </ul>
  );
}
