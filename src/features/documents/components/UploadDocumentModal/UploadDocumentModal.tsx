"use client";

import { Button } from "@/components/ui/Button/Button";
import { DropZone } from "@/components/ui/DropZone/DropZone";
import { Modal } from "@/components/ui/Modal/Modal";
import { queue } from "@/components/ui/Toast/Toast";
import { FileList } from "@/features/documents/components/FileList/FileList";
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

const ACCEPTED_TYPES = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".txt",
  ".csv",
] as const;

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
        queue.add({
          title: `${currentFailed.length} file${currentFailed.length > 1 ? "s" : ""} failed to upload`,
        });
      }
      resetFiles();
    }
    onOpenChange(open);
  }

  async function handleUploadAll() {
    const { uploaded, failed } = await uploadFiles();

    if (failed === 0 && uploaded > 0) {
      queue.add(
        { title: `${uploaded} file${uploaded > 1 ? "s" : ""} uploaded` },
        { timeout: 5000 },
      );
      resetFiles();
      onOpenChange(false);
      onSuccess();
    }
  }

  function handleRetryFailed() {
    handleUploadAll();
  }

  return (
    <Modal title="Upload Attachment" isOpen={isOpen} onOpenChange={handleClose}>
      <div className={styles.content}>
        <DropZone
          allowsMultiple
          onFileSelect={addFiles}
          acceptedFileTypes={ACCEPTED_TYPES}
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
