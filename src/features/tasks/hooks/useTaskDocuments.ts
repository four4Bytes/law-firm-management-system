"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getDocumentsPaginatedAction } from "@/features/documents/actions";
import { useDocumentDownload } from "@/features/documents/hooks/useDocumentDownload";
import type { DocumentRow } from "@/features/documents/queries";
import { appendPage } from "@/lib/domain/pagination";
import { toastError } from "@/lib/hooks/toast-utils";

interface UseTaskDocumentsReturn {
  documents: DocumentRow[];
  isLoading: boolean;
  isLoadingMore: boolean;
  nextCursor: string | null;
  previewDocument: DocumentRow | null;
  setPreviewDocument: (doc: DocumentRow | null) => void;
  handleDownload: (doc: Pick<DocumentRow, "id">) => Promise<void>;
  reload: () => void;
  loadMore: () => Promise<void>;
}

export function useTaskDocuments(taskId: string): UseTaskDocumentsReturn {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [previewDocument, setPreviewDocument] = useState<DocumentRow | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const loadingRef = useRef(false);
  const generationRef = useRef(0);
  const { handleDownload } = useDocumentDownload();

  useEffect(() => {
    let cancelled = false;
    generationRef.current += 1;
    async function loadFirstPage(): Promise<void> {
      setDocuments([]);
      setNextCursor(null);
      setPreviewDocument(null);
      setIsLoading(true);
      try {
        const res = await getDocumentsPaginatedAction({
          taskId,
          pageSize: 20,
          sort: { column: "created_at", direction: "desc" },
        });
        if (!cancelled) {
          setDocuments(res.rows);
          setNextCursor(res.nextCursor);
          setIsLoading(false);
        }
      } catch {
        if (cancelled) return;
        toastError(
          "Failed to load attachments",
          "We couldn't load the attachments for this task. Please try again.",
        );
        setIsLoading(false);
      }
    }
    void loadFirstPage();
    return () => {
      cancelled = true;
    };
  }, [taskId, reloadKey]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !nextCursor) return;
    loadingRef.current = true;
    setIsLoadingMore(true);
    const activeTaskId = taskId;
    const generation = generationRef.current;
    const cursor = nextCursor;
    try {
      const res = await getDocumentsPaginatedAction({
        taskId: activeTaskId,
        pageSize: 20,
        cursor,
        sort: { column: "created_at", direction: "desc" },
      });
      if (generation !== generationRef.current) return;
      setDocuments((prev) => appendPage(prev, res.rows));
      setNextCursor(res.nextCursor);
    } catch {
      toastError("Failed to load more", "Additional attachments could not be loaded.");
    } finally {
      loadingRef.current = false;
      setIsLoadingMore(false);
    }
  }, [taskId, nextCursor]);

  return {
    documents,
    isLoading,
    isLoadingMore,
    nextCursor,
    previewDocument,
    setPreviewDocument,
    handleDownload,
    reload: () => setReloadKey((k) => k + 1),
    loadMore,
  };
}
