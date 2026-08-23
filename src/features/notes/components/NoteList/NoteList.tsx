"use client";

import { useState } from "react";
import { FaEye, FaPen, FaRegNoteSticky, FaXmark } from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";
import { ViewNoteModal } from "@/features/notes/components/ViewNoteModal/ViewNoteModal";
import type { NoteRow } from "@/features/notes/queries";

import styles from "./NoteList.module.css";

interface NoteListProps {
  notes: NoteRow[];
  onEdit?: (note: NoteRow) => void;
  onDelete?: (noteId: string) => void;
}

export function NoteList({ notes, onEdit, onDelete }: NoteListProps) {
  const [viewNote, setViewNote] = useState<NoteRow | null>(null);

  if (notes.length === 0) return null;

  return (
    <>
      <ul className={styles.noteList}>
        {notes.map((note) => (
          <li key={note.id} className={styles.noteRow}>
            <FaRegNoteSticky className={styles.noteIcon} aria-hidden="true" />
            <span className={styles.noteContent} title={note.content}>
              {note.content}
            </span>
            <Button
              variant="ghost"
              className={styles.viewButton}
              aria-label="View note"
              onPress={() => setViewNote(note)}
            >
              <FaEye />
            </Button>
            {onEdit && (
              <Button
                variant="ghost"
                className={styles.editButton}
                aria-label={`Edit ${note.author}'s note`}
                onPress={() => onEdit(note)}
              >
                <FaPen />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                className={styles.deleteButton}
                aria-label={`Delete ${note.author}'s note`}
                onPress={() => onDelete(note.id)}
              >
                <FaXmark />
              </Button>
            )}
          </li>
        ))}
      </ul>
      {viewNote && (
        <ViewNoteModal isOpen={!!viewNote} onOpenChange={() => setViewNote(null)} note={viewNote} />
      )}
    </>
  );
}
