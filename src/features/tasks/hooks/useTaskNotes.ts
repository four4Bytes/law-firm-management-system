"use client";

import { useEffect, useState } from "react";

import { getTaskNotesPaginatedAction } from "@/features/notes/actions";
import type { NoteRow } from "@/features/notes/queries";
import { toastError } from "@/lib/toast-utils";

interface UseTaskNotesReturn {
  notes: NoteRow[];
  isLoading: boolean;
  reload: () => void;
}

export function useTaskNotes(taskId: string): UseTaskNotesReturn {
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadNotes(): Promise<void> {
      setNotes([]);
      setIsLoading(true);
      try {
        const allNotes: NoteRow[] = [];
        let cursor: string | undefined;
        do {
          const res = await getTaskNotesPaginatedAction({
            taskId,
            pageSize: 100,
            cursor,
          });
          allNotes.push(...res.rows);
          cursor = res.nextCursor ?? undefined;
        } while (cursor);
        if (cancelled) return;
        setNotes(allNotes);
      } catch {
        if (cancelled) return;
        toastError(
          "Failed to load notes",
          "We couldn't load the notes for this task. Please try again.",
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadNotes();

    return () => {
      cancelled = true;
    };
  }, [taskId, reloadKey]);

  return { notes, isLoading, reload: () => setReloadKey((k) => k + 1) };
}
