"use client";

import { useEffect, useState } from "react";

import { getDocumentsPaginatedAction } from "@/features/documents/actions";
import { useDocumentDownload } from "@/features/documents/hooks/useDocumentDownload";
import type { DocumentRow } from "@/features/documents/queries";
import { toastError } from "@/lib/toast-utils";

interface UseTaskDocumentsReturn {
  documents: DocumentRow[];
  isLoading: boolean;
  previewDocument: DocumentRow | null;
  setPreviewDocument: (doc: DocumentRow | null) => void;
  handleDownload: (doc: Pick<DocumentRow, "id">) => Promise<void>;
  reload: () => void;
}

export function useTaskDocuments(taskId: string): UseTaskDocumentsReturn {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previewDocument, setPreviewDocument] = useState<DocumentRow | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const { handleDownload } = useDocumentDownload();

  useEffect(() => {
    let cancelled = false;

    async function loadDocuments(): Promise<void> {
      setDocuments([]);
      setPreviewDocument(null);
      setIsLoading(true);
      try {
        const allDocs: DocumentRow[] = [];
        let cursor: string | undefined;
        do {
          const res = await getDocumentsPaginatedAction({
            taskId,
            pageSize: 100,
            cursor,
          });
          allDocs.push(...res.rows);
          cursor = res.nextCursor ?? undefined;
        } while (cursor);
        if (cancelled) return;
        setDocuments(allDocs);
      } catch {
        if (cancelled) return;
        toastError(
          "Failed to load attachments",
          "We couldn't load the attachments for this task. Please try again.",
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadDocuments();

    return () => {
      cancelled = true;
    };
  }, [taskId, reloadKey]);

  return {
    documents,
    isLoading,
    previewDocument,
    setPreviewDocument,
    handleDownload,
    reload: () => setReloadKey((k) => k + 1),
  };
}
