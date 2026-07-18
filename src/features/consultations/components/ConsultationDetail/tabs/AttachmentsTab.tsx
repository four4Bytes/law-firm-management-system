"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import type { ColumnDef } from "@/components/ui/DataTable/DataTable";
import { ServerDataTable } from "@/components/ui/ServerDataTable/ServerDataTable";
import { queue } from "@/components/ui/Toast/Toast";
import {
  getDocumentDetailRowAction,
  getDocumentsPaginatedAction,
} from "@/features/documents/actions";
import { UploadDocumentModal } from "@/features/documents/components/UploadDocumentModal/UploadDocumentModal";
import { ViewAttachmentModal } from "@/features/documents/components/ViewAttachmentModal/ViewAttachmentModal";
import type { DocumentDetailRow, DocumentRow } from "@/features/documents/queries";
import { formatDateTime } from "@/lib/date";
import { formatFileSize, formatFileType } from "@/lib/file-format";

interface Props {
  consultationId: string;
}

export function AttachmentsTab({ consultationId }: Props) {
  const [isUploadModalOpen, setUploadModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedDocument, setSelectedDocument] = useState<DocumentDetailRow | null>(null);
  const requestRef = useRef(0);

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
        name: "Uploaded At",
        allowsSorting: true,
        render: (value) => formatDateTime(value as Date),
      },
    ],
    [],
  );

  const handleRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  async function handleRowAction(key: string) {
    const requestId = ++requestRef.current;

    try {
      const doc = await getDocumentDetailRowAction(key);
      if (requestRef.current !== requestId) return;
      setSelectedDocument(doc);
    } catch {
      queue.add({
        title: "Failed to load document",
        description: "Could not retrieve document details. Please try again.",
      });
    }
  }

  return (
    <>
      <ServerDataTable
        refreshTrigger={refreshKey}
        fetchAction={(p) => getDocumentsPaginatedAction({ consultationId, ...p })}
        columns={columns}
        searchPlaceholder="Search attachments..."
        emptyContent="No attachments yet"
        loadingMessage="Loading attachments..."
        searchLabel="Search attachments"
        renderAddButton
        addButtonLabel="Add Attachment"
        onAddButtonPress={() => setUploadModalOpen(true)}
        onRowAction={handleRowAction}
      />
      <UploadDocumentModal
        isOpen={isUploadModalOpen}
        onOpenChange={setUploadModalOpen}
        onSuccess={handleRefresh}
        consultationId={consultationId}
      />
      {selectedDocument && (
        <ViewAttachmentModal
          isOpen={!!selectedDocument}
          onOpenChange={() => setSelectedDocument(null)}
          onSuccess={handleRefresh}
          document={selectedDocument}
        />
      )}
    </>
  );
}
