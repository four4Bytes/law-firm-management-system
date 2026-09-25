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
                aria-label={`View details of ${file_name}`}
                isDisabled={isBusy}
                onPress={() => onView(document)}
              >
                <FaEye />
              </Button>
              <Tooltip>{`View details of ${file_name}`}</Tooltip>
            </TooltipTrigger>
          )}

          <TooltipTrigger>
            <Link
              href={`/document/preview/${id}`}
              target="_blank"
              className={styles.actionButton}
              aria-label={`Open ${file_name} in a new page`}
            >
              <FaArrowUpRightFromSquare />
            </Link>
            <Tooltip>{`Open ${file_name} in a new page`}</Tooltip>
          </TooltipTrigger>

          {onDownload && (
            <TooltipTrigger>
              <Button
                variant="ghost"
                className={styles.actionButton}
                aria-label={`Download ${file_name}`}
                isDisabled={isBusy}
                isPending={isDownloading}
                onPress={() => onDownload(document)}
              >
                <FaDownload />
              </Button>
              <Tooltip>{`Download ${file_name}`}</Tooltip>
            </TooltipTrigger>
          )}

          {onDelete && (
            <TooltipTrigger>
              <Button
                variant="ghost"
                className={styles.actionButton}
                aria-label={`Delete ${file_name}`}
                isDisabled={isBusy}
                onPress={() => onDelete(id)}
              >
                <FaXmark />
              </Button>
              <Tooltip>{`Delete ${file_name}`}</Tooltip>
            </TooltipTrigger>
          )}
        </>
      }
      className={className}
    />
  );
}
