"use client";

import { useState } from "react";
import { FaPlus } from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";
import { deleteNoteAction } from "@/features/notes/actions";
import { AddNoteModal } from "@/features/notes/components/AddNoteModal/AddNoteModal";
import { EditNoteModal } from "@/features/notes/components/EditNoteModal/EditNoteModal";
import { NoteList } from "@/features/notes/components/NoteList/NoteList";
import type { NoteRow } from "@/features/notes/queries";
import { useTaskNotes } from "@/features/tasks/hooks/useTaskNotes";
import { toastActionError, toastSuccess } from "@/lib/toast-utils";

import styles from "./TaskNotesSection.module.css";

export interface TaskNotesSectionProps {
  taskId: string;
  canEdit: boolean;
  onSuccess: () => void;
}

export function TaskNotesSection({ taskId, canEdit, onSuccess }: TaskNotesSectionProps) {
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editNote, setEditNote] = useState<NoteRow | null>(null);
  const { notes: serverNotes, isLoading, reload } = useTaskNotes(taskId);

  const notes = serverNotes.filter((n) => !hiddenIds.has(n.id));

  async function handleRemoveNote(noteId: string): Promise<void> {
    if (deletingId) return;
    setDeletingId(noteId);
    setHiddenIds((prev) => new Set(prev).add(noteId));
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
    setDeletingId(null);
  }

  return (
    <div className={styles.section}>
      <div className={styles.columnHeader}>
        <span className={styles.label}>Notes · auto-saved</span>
        <Button
          className={styles.addNoteButton}
          variant="secondary"
          type="button"
          onPress={() => setAddOpen(true)}
          isDisabled={!canEdit}
        >
          <FaPlus /> Add Note
        </Button>
      </div>
      <NoteList
        notes={notes}
        isLoading={isLoading || deletingId !== null}
        onEdit={canEdit ? setEditNote : undefined}
        onDelete={canEdit ? handleRemoveNote : undefined}
      />
      <AddNoteModal
        isOpen={addOpen}
        onOpenChange={setAddOpen}
        onSuccess={() => {
          reload();
          onSuccess();
        }}
        taskId={taskId}
      />
      {editNote && (
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
