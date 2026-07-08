"use client";

import { useCallback, useMemo, useState } from "react";

import type { ColumnDef } from "@/components/ui/DataTable/DataTable";
import { ServerDataTable } from "@/components/ui/ServerDataTable/ServerDataTable";
import {
  getDocumentDownloadUrlAction,
  getDocumentsPaginatedAction,
} from "@/features/documents/actions";
import { UploadDocumentModal } from "@/features/documents/components/UploadDocumentModal/UploadDocumentModal";
import type { DocumentRow } from "@/features/documents/queries";
import { formatDateTime } from "@/lib/date";

import tabStyles from "./Tab.module.css";

interface Props {
  consultationId: string;
}

export function AttachmentsTab({ consultationId }: Props) {
  const [isModalOpen, setModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleDownload = useCallback(async (documentId: string) => {
    const { url } = await getDocumentDownloadUrlAction(documentId);
    window.open(url, "_blank");
  }, []);

  const columns: ColumnDef<DocumentRow>[] = useMemo(
    () => [
      {
        id: "file_name",
        name: "File Name",
        isRowHeader: true,
        allowsSorting: true,
        render: (value, row) => (
          <button
            className={tabStyles.fileLink}
            onClick={(e) => {
              e.stopPropagation();
              handleDownload(row.id);
            }}
            type="button"
          >
            {String(value)}
          </button>
        ),
      },
      { id: "file_type", name: "Type", allowsSorting: true },
      { id: "file_size", name: "Size", allowsSorting: true },
      { id: "uploadedBy", name: "Uploaded By" },
      {
        id: "created_at",
        name: "Uploaded At",
        allowsSorting: true,
        render: (value) => formatDateTime(value as Date),
      },
    ],
    [handleDownload],
  );

  const handleRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  return (
    <>
      <ServerDataTable
        key={refreshKey}
        fetchAction={(p) => getDocumentsPaginatedAction({ consultationId, ...p })}
        columns={columns}
        searchPlaceholder="Search attachments..."
        emptyContent="No attachments yet"
        loadingMessage="Loading attachments..."
        searchLabel="Search attachments"
        renderAddButton
        addButtonLabel="Add Attachment"
        onAddButtonPress={() => setModalOpen(true)}
      />
      <UploadDocumentModal
        isOpen={isModalOpen}
        onOpenChange={setModalOpen}
        onSuccess={handleRefresh}
        consultationId={consultationId}
      />
    </>
  );
}
