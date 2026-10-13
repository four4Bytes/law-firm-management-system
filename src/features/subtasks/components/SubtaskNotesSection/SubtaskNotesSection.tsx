"use client";

import { useState } from "react";
import { FaPlus } from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";
import { deleteNoteAction } from "@/features/notes/actions";
import { AddNoteModal } from "@/features/notes/components/AddNoteModal/AddNoteModal";
import { EditNoteModal } from "@/features/notes/components/EditNoteModal/EditNoteModal";
import { NoteList } from "@/features/notes/components/NoteList/NoteList";
import type { NoteRow } from "@/features/notes/queries";
import { useSubtaskNotes } from "@/features/subtasks/hooks/useSubtaskNotes";
import { toastActionError, toastError, toastSuccess } from "@/lib/hooks/toast-utils";

import styles from "./SubtaskNotesSection.module.css";

export interface SubtaskNotesSectionProps {
  subtaskId: string;
  canEdit: boolean;
  onSuccess: () => void;
  readOnly?: boolean;
}

export function SubtaskNotesSection({
  subtaskId,
  canEdit,
  onSuccess,
  readOnly,
}: SubtaskNotesSectionProps) {
  const editable = canEdit && !readOnly;
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editNote, setEditNote] = useState<NoteRow | null>(null);
  const {
    notes: serverNotes,
    isLoading,
    isLoadingMore,
    nextCursor,
    reload,
    loadMore,
  } = useSubtaskNotes(subtaskId);

  const notes = serverNotes.filter((n) => !hiddenIds.has(n.id));

  async function handleRemoveNote(noteId: string): Promise<void> {
    if (deletingId) return;
    setDeletingId(noteId);
    setHiddenIds((prev) => new Set(prev).add(noteId));
    try {
      const result = await deleteNoteAction({ noteId });
      if (!result.success) {
        setHiddenIds((prev) => {
          const next = new Set(prev);
          next.delete(noteId);
          return next;
        });
        toastActionError(result, "delete note");
      } else {
        toastSuccess("Note deleted", "The note was removed.");
        reload();
        onSuccess();
      }
    } catch {
      setHiddenIds((prev) => {
        const next = new Set(prev);
        next.delete(noteId);
        return next;
      });
      toastError(
        "Unexpected error",
        "Something went wrong while deleting the note. Please try again.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className={styles.section}>
      {!readOnly && (
        <div className={styles.columnHeader}>
          <span className={styles.label}>Notes</span>
          <Button
            className={styles.addNoteButton}
            variant="secondary"
            type="button"
            onPress={() => setAddOpen(true)}
            isDisabled={!editable}
          >
            <FaPlus /> Add Note
          </Button>
        </div>
      )}
      <NoteList
        notes={notes}
        isLoading={isLoading || deletingId !== null}
        hasMore={nextCursor !== null}
        isLoadingMore={isLoadingMore}
        onLoadMore={loadMore}
        onEdit={editable ? setEditNote : undefined}
        onDelete={editable ? handleRemoveNote : undefined}
      />
      {!readOnly && (
        <AddNoteModal
          isOpen={addOpen}
          onOpenChange={setAddOpen}
          onSuccess={() => {
            reload();
            onSuccess();
          }}
          subtaskId={subtaskId}
        />
      )}
      {editNote && editable && (
        <EditNoteModal
          isOpen={!!editNote}
          onOpenChange={() => setEditNote(null)}
          onSuccess={() => {
            reload();
            onSuccess();
          }}
          note={editNote}
        />
      )}
    </div>
  );
}
