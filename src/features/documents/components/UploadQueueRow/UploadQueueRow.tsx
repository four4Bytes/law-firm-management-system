"use client";

import { FaCheck, FaXmark } from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";
import { ProgressCircle } from "@/components/ui/ProgressCircle/ProgressCircle";
import { Tooltip, TooltipTrigger } from "@/components/ui/Tooltip/Tooltip";
import { FileRow } from "@/features/documents/components/FileRow/FileRow";
import type { FileEntry } from "@/lib/hooks/useFileUpload";

import styles from "./UploadQueueRow.module.css";

interface UploadQueueRowProps {
  entry: FileEntry;
  previewUrl?: string | null;
  isBusy: boolean;
  onRemove: (id: number) => void;
  className?: string;
}

function StatusIndicator({ entry }: { entry: FileEntry }) {
  if (entry.status === "uploading") {
    return <ProgressCircle aria-label={`Uploading ${entry.file.name}`} />;
  }

  if (entry.status === "done") {
    return <FaCheck className={styles.doneIcon} aria-label="Uploaded" />;
  }

  if (entry.status === "failed") {
    return <FaXmark className={styles.failedIcon} aria-label={entry.error ?? "Upload failed"} />;
  }

  return null;
}

export function UploadQueueRow({
  entry,
  previewUrl,
  isBusy,
  onRemove,
  className,
}: UploadQueueRowProps) {
  const { file, status, error } = entry;

  const removeButton =
    status === "pending" ? (
      <TooltipTrigger>
        <Button
          variant="ghost"
          className={styles.actionButton}
          aria-label={`Remove ${file.name}`}
          isDisabled={isBusy}
          onPress={() => onRemove(entry.id)}
        >
          <FaXmark />
        </Button>
        <Tooltip>{`Remove ${file.name}`}</Tooltip>
      </TooltipTrigger>
    ) : null;

  return (
    <div className={className} data-status={status}>
      <FileRow
        fileName={file.name}
        fileType={file.type}
        fileSize={file.size}
        previewUrl={previewUrl}
        trailing={removeButton ?? <StatusIndicator entry={entry} />}
      />
      {status === "failed" && error && <p className={styles.errorMessage}>{error}</p>}
    </div>
  );
}
