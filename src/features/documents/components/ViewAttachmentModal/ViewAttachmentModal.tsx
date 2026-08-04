"use client";

import { FilePreviewCard } from "@/components/ui/FilePreviewCard/FilePreviewCard";
import { Modal } from "@/components/ui/Modal/Modal";
import type { DocumentRow } from "@/features/documents/queries";
import { truncateFilename } from "@/lib/file-format";

import styles from "./ViewAttachmentModal.module.css";

interface ViewAttachmentModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  document: DocumentRow;
}

export function ViewAttachmentModal({
  isOpen,
  onOpenChange,
  document: doc,
}: ViewAttachmentModalProps) {
  return (
    <Modal
      title={truncateFilename(doc.file_name)}
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
      </div>
    </Modal>
  );
}
