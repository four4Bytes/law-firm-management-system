"use client";

import { useCallback, useRef, useState } from "react";

import { getDocumentDownloadUrlAction } from "@/features/documents/actions";
import type { DocumentRow } from "@/features/documents/queries";
import { toastError } from "@/lib/toast-utils";

interface UseDocumentDownloadReturn {
  handleDownload: (doc: Pick<DocumentRow, "id">) => Promise<void>;
  pendingIds: Set<string>;
}

export function useDocumentDownload(): UseDocumentDownloadReturn {
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const nextRequestId = useRef(0);
  const requestRefs = useRef(new Map<string, number>());

  const handleDownload = useCallback(async (doc: Pick<DocumentRow, "id">) => {
    const requestId = ++nextRequestId.current;
    requestRefs.current.set(doc.id, requestId);
    setPendingIds((prev) => new Set(prev).add(doc.id));
    try {
      const { url, file_name } = await getDocumentDownloadUrlAction(doc.id);
      if (requestRefs.current.get(doc.id) !== requestId) return;
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file_name;
      anchor.click();
      anchor.remove();
    } catch {
      if (requestRefs.current.get(doc.id) !== requestId) return;
      toastError("Failed to download file", "The file could not be downloaded. Please try again.");
    } finally {
      if (requestRefs.current.get(doc.id) === requestId) {
        requestRefs.current.delete(doc.id);
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(doc.id);
          return next;
        });
      }
    }
  }, []);

  return { handleDownload, pendingIds };
}
