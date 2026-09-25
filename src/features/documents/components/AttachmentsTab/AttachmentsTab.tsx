"use client";

import { useCallback, useMemo, useState } from "react";
import { FaArrowUpRightFromSquare, FaDownload, FaEye, FaTrashCan } from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog/ConfirmDialog";
import type { ColumnDef } from "@/components/ui/DataTable/DataTable";
import { Link } from "@/components/ui/Link/Link";
import { ServerDataTable } from "@/components/ui/ServerDataTable/ServerDataTable";
import { Tooltip, TooltipTrigger } from "@/components/ui/Tooltip/Tooltip";
import { deleteDocumentAction, getDocumentsPaginatedAction } from "@/features/documents/actions";
import { DocumentDetailsModal } from "@/features/documents/components/DocumentDetailsModal/DocumentDetailsModal";
import { UploadDocumentModal } from "@/features/documents/components/UploadDocumentModal/UploadDocumentModal";
import { useDocumentDownload } from "@/features/documents/hooks/useDocumentDownload";
import type { DocumentRow } from "@/features/documents/queries";
import type { Role } from "@/generated/prisma/browser";
import { formatFileSize, formatFileType } from "@/lib/files/file-format";
import { toastActionError, toastSuccess } from "@/lib/hooks/toast-utils";
import { formatDateTime } from "@/lib/primitives/date";
import { can, type AccessContext } from "@/lib/security/rbac";

import styles from "./AttachmentsTab.module.css";

interface Props {
  caseId?: string;
  consultationId?: string;
  taskId?: string;
  access: AccessContext;
  userRole: Role | null;
}

export function AttachmentsTab({ caseId, consultationId, taskId, access, userRole }: Props) {
  const [isUploadModalOpen, setUploadModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [detailsDocument, setDetailsDocument] = useState<DocumentRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocumentRow | null>(null);
  const canCreate = can(userRole, "attachment.create", access);

  const handleRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const { handleDownload, pendingIds } = useDocumentDownload();

  async function handleDelete() {
    if (!deleteTarget) return;
    const result = await deleteDocumentAction({ documentId: deleteTarget.id });
    if (result.success) {
      setDeleteTarget(null);
      handleRefresh();
      toastSuccess("Attachment deleted", "The attachment has been deleted.");
    } else {
      toastActionError(result, "delete attachment");
    }
  }

  const columns: ColumnDef<DocumentRow>[] = useMemo(
    () => [
      {
        id: "file_name",
        name: "File Name",
        isRowHeader: true,
        allowsSorting: true,
      },
      {
        id: "file_type",
        name: "Type",
        allowsSorting: true,
        render: (value) => formatFileType(value as string),
      },
      {
        id: "file_size",
        name: "Size",
        allowsSorting: true,
        render: (value) => formatFileSize(value as number | null),
      },
      { id: "uploadedBy", name: "Uploaded By" },
      {
        id: "created_at",
        name: "Date",
        allowsSorting: true,
        render: (value) => formatDateTime(value as Date),
      },
      {
        id: "id" as const,
        name: "Action" as const,
        render: (_value: unknown, row: unknown) => {
          const doc = row as DocumentRow;
          return (
            <div className={styles.actions}>
              <TooltipTrigger>
                <Button
                  variant="ghost"
                  aria-label={`View details of ${doc.file_name}`}
                  onPress={() => setDetailsDocument(doc)}
                >
                  <FaEye className={styles.icon} />
                </Button>
                <Tooltip>{`View details of ${doc.file_name}`}</Tooltip>
              </TooltipTrigger>
              <TooltipTrigger>
                <Link
                  href={`/document/preview/${doc.id}`}
                  target="_blank"
                  className={styles.openPageLink}
                  aria-label={`Open ${doc.file_name} in a new page`}
                >
                  <FaArrowUpRightFromSquare className={styles.icon} />
                </Link>
                <Tooltip>{`Open ${doc.file_name} in a new page`}</Tooltip>
              </TooltipTrigger>
              <TooltipTrigger>
                <Button
                  variant="ghost"
                  aria-label={`Download ${doc.file_name}`}
                  onPress={() => handleDownload(doc)}
                  isPending={pendingIds.has(doc.id)}
                >
                  <FaDownload className={styles.icon} />
                </Button>
                <Tooltip>{`Download ${doc.file_name}`}</Tooltip>
              </TooltipTrigger>
              <TooltipTrigger>
                <Button
                  variant="ghost"
                  aria-label={`Delete ${doc.file_name}`}
                  onPress={() => setDeleteTarget(doc)}
                >
                  <FaTrashCan className={styles.icon} />
                </Button>
                <Tooltip>{`Delete ${doc.file_name}`}</Tooltip>
              </TooltipTrigger>
            </div>
          );
        },
      },
    ],
    [handleDownload, pendingIds],
  );

  return (
    <>
      <ServerDataTable
        refreshTrigger={refreshKey}
        fetchAction={(p) => getDocumentsPaginatedAction({ caseId, consultationId, taskId, ...p })}
        columns={columns}
        searchPlaceholder="Search attachments..."
        emptyContent="No attachments yet"
        loadingMessage="Loading attachments..."
        searchLabel="Search attachments"
        selectionMode="none"
        collectionDependencies={[pendingIds]}
        renderAddButton={canCreate}
        addButtonLabel="Add Attachment"
        onAddButtonPress={() => setUploadModalOpen(true)}
      />
      <UploadDocumentModal
        isOpen={isUploadModalOpen}
        onOpenChange={setUploadModalOpen}
        onSuccess={handleRefresh}
        caseId={caseId}
        consultationId={consultationId}
        taskId={taskId}
      />
      {detailsDocument && (
        <DocumentDetailsModal
          isOpen={!!detailsDocument}
          onOpenChange={() => setDetailsDocument(null)}
          document={detailsDocument}
        />
      )}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete Attachment"
        confirmLabel="Delete"
        onConfirm={handleDelete}
      >
        Are you sure you want to delete this attachment? This action cannot be undone.
      </ConfirmDialog>
    </>
  );
}
