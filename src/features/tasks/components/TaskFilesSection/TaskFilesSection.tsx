"use client";

import { useEffect, useState } from "react";

import { DropZone } from "@/components/ui/DropZone/DropZone";
import { deleteDocumentAction } from "@/features/documents/actions";
import { FileList } from "@/features/documents/components/FileList/FileList";
import { ViewAttachmentModal } from "@/features/documents/components/ViewAttachmentModal/ViewAttachmentModal";
import type { DocumentRow } from "@/features/documents/queries";
import { useTaskDocuments } from "@/features/tasks/hooks/useTaskDocuments";
import { ACCEPTED_FILE_EXTENSIONS } from "@/lib/file-types";
import { toastActionError, toastSuccess } from "@/lib/toast-utils";
import { useFileUpload } from "@/lib/useFileUpload";

import styles from "./TaskFilesSection.module.css";

export interface TaskFilesSectionProps {
  taskId: string;
  canEdit: boolean;
  onSuccess: () => void;
  readOnly?: boolean;
}

export function TaskFilesSection({ taskId, canEdit, onSuccess, readOnly }: TaskFilesSectionProps) {
  const editable = canEdit && !readOnly;
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const {
    documents: serverDocuments,
    isLoading,
    previewDocument,
    setPreviewDocument,
    handleDownload,
    reload,
  } = useTaskDocuments(taskId);
  const { fileEntries, isUploading, addFiles, removeFile, resetFiles, uploadFiles } = useFileUpload(
    {
      taskId,
    },
  );

  const documents: DocumentRow[] = serverDocuments.filter((d) => !hiddenIds.has(d.id));

  useEffect(() => {
    const hasPending = fileEntries.some((e) => e.status === "pending");
    if (!hasPending || isUploading) return;
    void (async () => {
      const { uploaded, failed } = await uploadFiles();
      if (uploaded > 0) {
        toastSuccess(
          `Uploaded ${uploaded} file${uploaded > 1 ? "s" : ""}`,
          "The attachments were saved.",
        );
        reload();
        onSuccess();
      }
      if (uploaded > 0 && failed === 0) resetFiles();
    })();
  }, [fileEntries, isUploading, uploadFiles, reload, onSuccess, resetFiles]);

  async function handleRemoveDocument(documentId: string): Promise<void> {
    if (deletingId) return;
    setDeletingId(documentId);
    setHiddenIds((prev) => new Set(prev).add(documentId));
    const result = await deleteDocumentAction({ documentId });
    if (!result.success) {
      setHiddenIds((prev) => {
        const next = new Set(prev);
        next.delete(documentId);
        return next;
      });
      toastActionError(result, "delete document");
    } else {
      toastSuccess("Document deleted", "The attachment was removed.");
      reload();
      onSuccess();
    }
    setDeletingId(null);
  }

  return (
    <div className={styles.section}>
      {!readOnly && (
        <DropZone
          allowsMultiple
          onFileSelect={(files) => addFiles(files)}
          acceptedFileTypes={ACCEPTED_FILE_EXTENSIONS}
          isDisabled={isUploading || !editable}
          label="Drop files or click to upload"
          description="Supported: PDF, DOC, XLS, images, TXT, CSV"
        />
      )}
      <FileList
        entries={readOnly ? [] : fileEntries}
        isBusy={isUploading || deletingId !== null}
        onRemove={removeFile}
        existingDocuments={documents}
        onView={setPreviewDocument}
        onDownload={handleDownload}
        onDelete={editable ? handleRemoveDocument : undefined}
        isLoading={isLoading}
        showSize={false}
      />
      {previewDocument && (
        <ViewAttachmentModal
          isOpen={!!previewDocument}
          onOpenChange={() => setPreviewDocument(null)}
          document={previewDocument}
        />
      )}
    </div>
  );
}
