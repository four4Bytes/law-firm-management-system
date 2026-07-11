"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog/ConfirmDialog";
import { FilePreviewCard } from "@/components/ui/FilePreviewCard/FilePreviewCard";
import { Modal } from "@/components/ui/Modal/Modal";
import { ProgressCircle } from "@/components/ui/ProgressCircle/ProgressCircle";
import { queue } from "@/components/ui/Toast/Toast";
import { deleteDocumentAction, getDocumentDownloadUrlAction } from "@/features/documents/actions";
import type { DocumentDetailRow } from "@/features/documents/queries";

import styles from "./ViewAttachmentModal.module.css";

interface ViewAttachmentModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void;
  document: DocumentDetailRow;
}

export function ViewAttachmentModal({
  isOpen,
  onOpenChange,
  onSuccess,
  document: doc,
}: ViewAttachmentModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  async function handleDownload() {
    setIsDownloading(true);
    try {
      const { url, file_name } = await getDocumentDownloadUrlAction(doc.id);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file_name;
      anchor.click();
      anchor.remove();
    } catch (e) {
      queue.add(
        { title: e instanceof Error ? e.message : "Failed to download file" },
        { timeout: 5000 },
      );
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);

    try {
      const result = await deleteDocumentAction(doc.id);

      if (result.success) {
        queue.add({ title: "Attachment deleted" }, { timeout: 5000 });
        onOpenChange(false);
        onSuccess();
      } else {
        queue.add({ title: result.error ?? "Failed to delete attachment" }, { timeout: 5000 });
      }
    } catch {
      queue.add({ title: "Failed to delete attachment" }, { timeout: 5000 });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  const isBusy = isDownloading || isDeleting;

  return (
    <>
      <Modal
        title={doc.file_name}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        className={styles.modal}
      >
        <div className={styles.content}>
          <FilePreviewCard
            file_name={doc.file_name}
            file_type={doc.file_type}
            file_size={doc.file_size}
            uploadedBy={doc.uploadedBy}
            created_at={doc.created_at}
          />

          <div className={styles.actions}>
            <Button variant="secondary" onPress={handleDownload} isDisabled={isBusy}>
              {isDownloading ? "Opening..." : "Download"}
            </Button>
            <Button onPress={() => setShowDeleteConfirm(true)} isDisabled={isBusy}>
              {isDeleting ? <ProgressCircle aria-label="Deleting" /> : "Delete"}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Attachment"
        confirmLabel="Delete"
        onConfirm={handleDelete}
      >
        Are you sure you want to delete this attachment? This action cannot be undone.
      </ConfirmDialog>
    </>
  );
}
