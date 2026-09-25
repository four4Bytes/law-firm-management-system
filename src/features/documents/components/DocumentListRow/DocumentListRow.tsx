import { FaArrowUpRightFromSquare, FaDownload, FaEye, FaXmark } from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";
import { Link } from "@/components/ui/Link/Link";
import { Tooltip, TooltipTrigger } from "@/components/ui/Tooltip/Tooltip";
import { FileRow } from "@/features/documents/components/FileRow/FileRow";
import type { DocumentRow } from "@/features/documents/queries";

import styles from "./DocumentListRow.module.css";

interface DocumentListRowProps {
  document: DocumentRow;
  isBusy: boolean;
  showSize?: boolean;
  isDownloading?: boolean;
  className?: string;
  onDownload?: (document: DocumentRow) => void;
  onView?: (document: DocumentRow) => void;
  onDelete?: (documentId: string) => void;
}

export function DocumentListRow({
  document,
  isBusy,
  showSize = true,
  isDownloading,
  className,
  onDownload,
  onView,
  onDelete,
}: DocumentListRowProps) {
  const { id, file_name, file_type, file_size } = document;

  return (
    <FileRow
      fileName={file_name}
      fileType={file_type}
      fileSize={showSize ? file_size : null}
      trailing={
        <>
          {onView && (
            <TooltipTrigger>
              <Button
                variant="ghost"
                className={styles.actionButton}
                aria-label="View document details"
                isDisabled={isBusy}
                onPress={() => onView(document)}
              >
                <FaEye />
              </Button>
              <Tooltip>View document details</Tooltip>
            </TooltipTrigger>
          )}

          <TooltipTrigger>
            <Link
              href={`/document/preview/${id}`}
              target="_blank"
              className={styles.actionButton}
              aria-label="Open document in a new page"
            >
              <FaArrowUpRightFromSquare />
            </Link>
            <Tooltip>Open document in a new page</Tooltip>
          </TooltipTrigger>

          {onDownload && (
            <TooltipTrigger>
              <Button
                variant="ghost"
                className={styles.actionButton}
                aria-label="Download document"
                isDisabled={isBusy}
                isPending={isDownloading}
                onPress={() => onDownload(document)}
              >
                <FaDownload />
              </Button>
              <Tooltip>Download document</Tooltip>
            </TooltipTrigger>
          )}

          {onDelete && (
            <TooltipTrigger>
              <Button
                variant="ghost"
                className={styles.actionButton}
                aria-label="Delete document"
                isDisabled={isBusy}
                onPress={() => onDelete(id)}
              >
                <FaXmark />
              </Button>
              <Tooltip>Delete document</Tooltip>
            </TooltipTrigger>
          )}
        </>
      }
      className={className}
    />
  );
}
