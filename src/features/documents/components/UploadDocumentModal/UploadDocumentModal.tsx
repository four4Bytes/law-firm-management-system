"use client";

import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/Button/Button";
import { DropZone } from "@/components/ui/DropZone/DropZone";
import { Modal } from "@/components/ui/Modal/Modal";
import { UploadQueue } from "@/features/documents/components/UploadQueue/UploadQueue";
import { classifyFileType, formatFileSize } from "@/lib/files/file-format";
import { ACCEPTED_FILE_EXTENSIONS, isAcceptedFileExtension } from "@/lib/files/file-types";
import { getObjectUrl, revokeObjectUrl } from "@/lib/files/object-urls";
import {
  findDuplicateFiles,
  getAppMaxUploadBytes,
  isWithinUploadSizeLimit,
} from "@/lib/files/upload-policy";
import { toastError, toastSuccess } from "@/lib/hooks/toast-utils";
import { useFileUpload } from "@/lib/hooks/useFileUpload";

import styles from "./UploadDocumentModal.module.css";

interface UploadDocumentModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void;
  caseId?: string;
  consultationId?: string;
  taskId?: string;
}

const ACCEPTED_TYPE_COPY = "Supported: PDF, DOC, XLS, TXT, CSV, videos, images";

export function UploadDocumentModal({
  isOpen,
  onOpenChange,
  onSuccess,
  caseId,
  consultationId,
  taskId,
}: UploadDocumentModalProps) {
  const {
    fileEntries,
    isUploading,
    hasFiles,
    pendingCount,
    failedCount,
    addFiles,
    removeFile,
    resetFiles,
    uploadFiles,
  } = useFileUpload({ caseId, consultationId, taskId });
  const fileEntriesRef = useRef(fileEntries);

  useEffect(() => {
    fileEntriesRef.current = fileEntries;
  }, [fileEntries]);

  useEffect(
    () => () => {
      for (const entry of fileEntriesRef.current) {
        if (classifyFileType(entry.file.type) === "img") revokeObjectUrl(entry.file);
      }
    },
    [],
  );

  const hasUploading = fileEntries.some((entry) => entry.status === "uploading");
  const isBusy = isUploading || hasUploading;
  const totalBytes = fileEntries.reduce((sum, entry) => sum + entry.file.size, 0);
  const completedCount = fileEntries.filter(
    (entry) => entry.status === "done" || entry.status === "failed",
  ).length;

  function handleAddFiles(incoming: File[]) {
    const duplicates = findDuplicateFiles(
      incoming,
      fileEntries.map((entry) => entry.file),
    );
    const duplicateSet = new Set(duplicates);

    const accepted = incoming.filter(
      (file) =>
        !duplicateSet.has(file) &&
        file.size > 0 &&
        isAcceptedFileExtension(file.name) &&
        isWithinUploadSizeLimit(file.size),
    );
    const rejectedEmpty = incoming.filter(
      (file) => !duplicateSet.has(file) && file.size === 0,
    ).length;
    const rejectedWrongType = incoming.filter(
      (file) => !duplicateSet.has(file) && file.size > 0 && !isAcceptedFileExtension(file.name),
    ).length;
    const rejectedTooLarge = incoming.filter(
      (file) =>
        !duplicateSet.has(file) &&
        file.size > 0 &&
        isAcceptedFileExtension(file.name) &&
        !isWithinUploadSizeLimit(file.size),
    ).length;

    if (duplicates.length > 0) {
      toastError(
        `${duplicates.length} file${duplicates.length > 1 ? "s" : ""} already queued`,
        "Duplicate files were skipped. Remove the existing entry first if you meant to add it twice.",
      );
    }
    if (rejectedEmpty > 0) {
      toastError(
        `${rejectedEmpty} empty file${rejectedEmpty > 1 ? "s" : ""}`,
        "Empty files cannot be uploaded. Choose a file that contains data.",
      );
    }
    if (rejectedWrongType > 0) {
      toastError(
        `${rejectedWrongType} unsupported file${rejectedWrongType > 1 ? "s" : ""}`,
        "Those file types are not accepted. Upload a PDF, document, spreadsheet, image, text, or video file.",
      );
    }
    if (rejectedTooLarge > 0) {
      toastError(
        `${rejectedTooLarge} file${rejectedTooLarge > 1 ? "s" : ""} too large`,
        `Each file must be ${formatFileSize(getAppMaxUploadBytes())} or smaller.`,
      );
    }

    if (accepted.length > 0) addFiles(accepted);
  }

  function handleRemoveFile(id: number) {
    const removed = fileEntries.find((entry) => entry.id === id);
    if (removed) revokeObjectUrl(removed.file);
    removeFile(id);
  }

  function handleClose(open: boolean) {
    if (isBusy) return;
    if (!open) {
      const currentFailed = fileEntries.filter((entry) => entry.status === "failed");
      if (currentFailed.length > 0) {
        toastError(
          `${currentFailed.length} file${currentFailed.length > 1 ? "s" : ""} failed to upload`,
          "The failed files were cleared when the dialog closed. Re-add them to try again.",
        );
      }
      for (const entry of fileEntries) revokeObjectUrl(entry.file);
      resetFiles();
    }
    onOpenChange(open);
  }

  async function handleUploadAll() {
    try {
      const { uploaded, failed } = await uploadFiles();

      if (uploaded > 0) {
        toastSuccess(
          `${uploaded} file${uploaded > 1 ? "s" : ""} uploaded`,
          "Your files have been attached successfully.",
        );
      }

      if (failed === 0) {
        for (const entry of fileEntries) {
          if (classifyFileType(entry.file.type) === "img") revokeObjectUrl(entry.file);
        }
        resetFiles();
        onOpenChange(false);
      }

      if (uploaded > 0) onSuccess();
    } catch {
      toastError("Failed to upload files", "The files could not be uploaded. Please try again.");
    }
  }

  return (
    <Modal title="Upload Attachment" isOpen={isOpen} onOpenChange={handleClose}>
      <div className={styles.content}>
        <DropZone
          allowsMultiple
          onFileSelect={handleAddFiles}
          acceptedFileTypes={ACCEPTED_FILE_EXTENSIONS}
          isDisabled={isBusy}
          description={ACCEPTED_TYPE_COPY}
        />

        {hasFiles && (
          <>
            <p className={styles.summary}>
              {`${fileEntries.length} file${fileEntries.length > 1 ? "s" : ""} · ${formatFileSize(totalBytes)}`}
              {isBusy && ` — Uploading ${completedCount} of ${fileEntries.length}`}
            </p>

            <UploadQueue
              entries={fileEntries}
              isBusy={isBusy}
              onRemove={handleRemoveFile}
              getPreviewUrl={(entry) =>
                classifyFileType(entry.file.type) === "img" ? getObjectUrl(entry.file) : null
              }
            />
          </>
        )}

        <div className={styles.actions}>
          <Button variant="secondary" onPress={() => handleClose(false)} isDisabled={isBusy}>
            Cancel
          </Button>

          {failedCount > 0 && pendingCount === failedCount ? (
            <Button
              onPress={handleUploadAll}
              isDisabled={isBusy || failedCount === 0}
              isPending={isBusy}
            >
              {`Retry Failed (${failedCount})`}
            </Button>
          ) : (
            <Button
              onPress={handleUploadAll}
              isDisabled={!hasFiles || pendingCount === 0 || isBusy}
              isPending={isBusy}
            >
              {`Upload All (${pendingCount})`}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
