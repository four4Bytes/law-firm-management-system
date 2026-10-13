"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getSubtaskNotesPaginatedAction } from "@/features/notes/actions";
import type { NoteRow } from "@/features/notes/queries";
import { appendPage } from "@/lib/domain/pagination";
import { toastError } from "@/lib/hooks/toast-utils";

interface UseSubtaskNotesReturn {
  notes: NoteRow[];
  isLoading: boolean;
  isLoadingMore: boolean;
  nextCursor: string | null;
  reload: () => void;
  loadMore: () => Promise<void>;
}

export function useSubtaskNotes(subtaskId: string): UseSubtaskNotesReturn {
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const loadingRef = useRef(false);
  const generationRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    generationRef.current += 1;
    async function loadFirstPage(): Promise<void> {
      setNotes([]);
      setNextCursor(null);
      setIsLoading(true);
      try {
        const res = await getSubtaskNotesPaginatedAction({ subtaskId, pageSize: 20 });
        if (!cancelled) {
          setNotes(res.rows);
          setNextCursor(res.nextCursor);
          setIsLoading(false);
        }
      } catch {
        if (!cancelled) {
          toastError(
            "Failed to load notes",
            "We couldn't load the notes for this subtask. Please try again.",
          );
          setIsLoading(false);
        }
      }
    }
    void loadFirstPage();
    return () => {
      cancelled = true;
    };
  }, [subtaskId, reloadKey]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !nextCursor) return;
    loadingRef.current = true;
    setIsLoadingMore(true);
    const activeSubtaskId = subtaskId;
    const generation = generationRef.current;
    const cursor = nextCursor;
    try {
      const res = await getSubtaskNotesPaginatedAction({
        subtaskId: activeSubtaskId,
        pageSize: 20,
        cursor,
      });
      if (generation !== generationRef.current) return;
      setNotes((prev) => appendPage(prev, res.rows));
      setNextCursor(res.nextCursor);
    } catch {
      toastError("Failed to load more notes", "We couldn't load more notes. Please try again.");
    } finally {
      loadingRef.current = false;
      setIsLoadingMore(false);
    }
  }, [subtaskId, nextCursor]);

  return {
    notes,
    isLoading,
    isLoadingMore,
    nextCursor,
    reload: () => setReloadKey((k) => k + 1),
    loadMore,
  };
}
