"use client";

import { Button } from "@/components/ui/Button/Button";
import { DropZone } from "@/components/ui/DropZone/DropZone";
import { Modal } from "@/components/ui/Modal/Modal";
import { FileList } from "@/features/documents/components/FileList/FileList";
import { ACCEPTED_FILE_EXTENSIONS } from "@/lib/file-types";
import { toastError, toastSuccess } from "@/lib/toast-utils";
import { useFileUpload } from "@/lib/useFileUpload";

import styles from "./UploadDocumentModal.module.css";

interface UploadDocumentModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void;
  caseId?: string;
  consultationId?: string;
  taskId?: string;
}

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

  const hasUploading = fileEntries.some((e) => e.status === "uploading");
  const isBusy = isUploading || hasUploading;

  function handleClose(open: boolean) {
    if (isBusy) return;
    if (!open) {
      const currentFailed = fileEntries.filter((e) => e.status === "failed");
      if (currentFailed.length > 0) {
        toastError(
          `${currentFailed.length} file${currentFailed.length > 1 ? "s" : ""} failed to upload`,
          "The failed files were cleared when the dialog closed. Re-add them to try again.",
        );
      }
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
        resetFiles();
        onOpenChange(false);
      }

      if (uploaded > 0) {
        onSuccess();
      }
    } catch {
      toastError("Upload failed", "An unexpected error occurred. Please try again.");
    }
  }

  function handleRetryFailed() {
    void handleUploadAll();
  }

  return (
    <Modal title="Upload Attachment" isOpen={isOpen} onOpenChange={handleClose}>
      <div className={styles.content}>
        <DropZone
          allowsMultiple
          onFileSelect={addFiles}
          acceptedFileTypes={ACCEPTED_FILE_EXTENSIONS}
          isDisabled={isBusy}
          description="Supported: PDF, DOC, XLS, images, TXT, CSV"
        />

        <FileList entries={fileEntries} isBusy={isBusy} onRemove={removeFile} />

        <div className={styles.actions}>
          <Button variant="secondary" onPress={() => handleClose(false)} isDisabled={isBusy}>
            Cancel
          </Button>

          {failedCount > 0 && pendingCount === failedCount ? (
            <Button
              onPress={handleRetryFailed}
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
