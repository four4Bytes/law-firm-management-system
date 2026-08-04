"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { FaDownload, FaEye, FaTrashCan } from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog/ConfirmDialog";
import type { ColumnDef } from "@/components/ui/DataTable/DataTable";
import { ServerDataTable } from "@/components/ui/ServerDataTable/ServerDataTable";
import { queue } from "@/components/ui/Toast/Toast";
import {
  deleteDocumentAction,
  getDocumentDownloadUrlAction,
  getDocumentsPaginatedAction,
} from "@/features/documents/actions";
import { UploadDocumentModal } from "@/features/documents/components/UploadDocumentModal/UploadDocumentModal";
import { ViewAttachmentModal } from "@/features/documents/components/ViewAttachmentModal/ViewAttachmentModal";
import type { DocumentRow } from "@/features/documents/queries";
import type { Role } from "@/generated/prisma/browser";
import { formatDateTime } from "@/lib/date";
import { formatFileSize, formatFileType } from "@/lib/file-format";
import { can, type AccessContext } from "@/lib/rbac";

import styles from "./AttachmentsTab.module.css";

interface Props {
  caseId?: string;
  consultationId?: string;
  access: AccessContext;
  userRole: Role | null;
}

export function AttachmentsTab({ caseId, consultationId, access, userRole }: Props) {
  const [isUploadModalOpen, setUploadModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [previewDocument, setPreviewDocument] = useState<DocumentRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocumentRow | null>(null);
  const [pendingDownloadId, setPendingDownloadId] = useState<string | null>(null);
  const requestRef = useRef(0);

  const canCreate = can(userRole, "attachment.create", access);

  const handleRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const handleDownload = useCallback(async (doc: DocumentRow) => {
    const requestId = ++requestRef.current;
    setPendingDownloadId(doc.id);
    try {
      const { url, file_name } = await getDocumentDownloadUrlAction(doc.id);
      if (requestRef.current !== requestId) return;
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file_name;
      anchor.click();
      anchor.remove();
    } catch (e) {
      if (requestRef.current !== requestId) return;
      queue.add(
        { title: e instanceof Error ? e.message : "Failed to download file" },
        { timeout: 5000 },
      );
    } finally {
      if (requestRef.current === requestId) setPendingDownloadId(null);
    }
  }, []);

  async function handleDelete() {
    if (!deleteTarget) return;
    const result = await deleteDocumentAction({ documentId: deleteTarget.id });
    if (result.success) {
      setDeleteTarget(null);
      handleRefresh();
      queue.add({ title: "Attachment deleted" }, { timeout: 5000 });
    } else {
      queue.add({ title: result.error ?? "Failed to delete attachment" }, { timeout: 5000 });
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
              <Button
                variant="ghost"
                aria-label="Preview attachment"
                onPress={() => setPreviewDocument(doc)}
              >
                <FaEye className={styles.icon} />
              </Button>
              <Button
                variant="ghost"
                aria-label="Download attachment"
                onPress={() => handleDownload(doc)}
                isPending={pendingDownloadId === doc.id}
              >
                <FaDownload className={styles.icon} />
              </Button>
              <Button
                variant="ghost"
                aria-label="Delete attachment"
                onPress={() => setDeleteTarget(doc)}
              >
                <FaTrashCan className={styles.icon} />
              </Button>
            </div>
          );
        },
      },
    ],
    [pendingDownloadId, handleDownload],
  );

  return (
    <>
      <ServerDataTable
        refreshTrigger={refreshKey}
        fetchAction={(p) => getDocumentsPaginatedAction({ caseId, consultationId, ...p })}
        columns={columns}
        searchPlaceholder="Search attachments..."
        emptyContent="No attachments yet"
        loadingMessage="Loading attachments..."
        searchLabel="Search attachments"
        selectionMode="none"
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
      />
      {previewDocument && (
        <ViewAttachmentModal
          isOpen={!!previewDocument}
          onOpenChange={() => setPreviewDocument(null)}
          document={previewDocument}
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
