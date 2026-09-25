"use client";

import { FaArrowUpRightFromSquare, FaDownload } from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";
import { Link } from "@/components/ui/Link/Link";
import { Modal } from "@/components/ui/Modal/Modal";
import { FileIcon } from "@/features/documents/components/FileIcon/FileIcon";
import { useDocumentDownload } from "@/features/documents/hooks/useDocumentDownload";
import type { DocumentRow } from "@/features/documents/queries";
import { formatFileCategoryName, formatFileSize } from "@/lib/files/file-format";
import { formatDateTime } from "@/lib/primitives/date";

import styles from "./DocumentDetailsModal.module.css";

interface DocumentDetailsModalProps {
  isOpen: boolean;
  document: DocumentRow;
  onOpenChange: (isOpen: boolean) => void;
}

export function DocumentDetailsModal({
  isOpen,
  document,
  onOpenChange,
}: DocumentDetailsModalProps) {
  const { handleDownload, pendingIds } = useDocumentDownload();
  const isDownloading = pendingIds.has(document.id);

  return (
    <Modal title="Attachment details" isOpen={isOpen} onOpenChange={onOpenChange}>
      <div className={styles.content}>
        <div className={styles.heading}>
          <FileIcon fileType={document.file_type} className={styles.icon} />
          <div className={styles.headingText}>
            <span className={styles.fileName} title={document.file_name}>
              {document.file_name}
            </span>
            <span className={styles.meta}>
              {`${formatFileCategoryName(document.file_type)} · ${formatFileSize(document.file_size)}`}
            </span>
          </div>
        </div>

        <dl className={styles.details}>
          <div className={styles.detailRow}>
            <dt>Uploaded by</dt>
            <dd>{document.uploadedBy}</dd>
          </div>
          <div className={styles.detailRow}>
            <dt>Uploaded on</dt>
            <dd>{formatDateTime(document.created_at)}</dd>
          </div>
          {document.case && (
            <div className={styles.detailRow}>
              <dt>Attached to case</dt>
              <dd>
                <Link href={`/case/${document.case.id}`} className={styles.link}>
                  {document.case.case_title}
                </Link>
              </dd>
            </div>
          )}
          {document.consultation && (
            <div className={styles.detailRow}>
              <dt>Attached to consultation</dt>
              <dd>
                <Link href={`/consultation/${document.consultation.id}`} className={styles.link}>
                  {document.consultation.concern}
                </Link>
              </dd>
            </div>
          )}
          {document.task && document.task.case_id && (
            <div className={styles.detailRow}>
              <dt>Linked task</dt>
              <dd>
                <Link href={`/case/${document.task.case_id}`} className={styles.link}>
                  {document.task.title}
                </Link>
              </dd>
            </div>
          )}
        </dl>

        <div className={styles.actions}>
          <Button
            variant="secondary"
            isPending={isDownloading}
            onPress={() => void handleDownload(document)}
          >
            <FaDownload aria-hidden="true" /> Download
          </Button>
          <Link
            href={`/document/preview/${document.id}`}
            target="_blank"
            className={styles.openPageLink}
          >
            <FaArrowUpRightFromSquare aria-hidden="true" /> Open in new page
          </Link>
        </div>
      </div>
    </Modal>
  );
}
