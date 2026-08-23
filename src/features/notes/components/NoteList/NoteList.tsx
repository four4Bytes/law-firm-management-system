"use client";

import { useState } from "react";
import { FaEye } from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";
import { ViewNoteModal } from "@/features/notes/components/ViewNoteModal/ViewNoteModal";
import type { NoteRow } from "@/features/notes/queries";

import styles from "./NoteList.module.css";

interface NoteListProps {
  notes: NoteRow[];
}

export function NoteList({ notes }: NoteListProps) {
  const [viewNote, setViewNote] = useState<NoteRow | null>(null);

  if (notes.length === 0) return null;

  return (
    <>
      <ul className={styles.noteList}>
        {notes.map((note) => (
          <li key={note.id} className={styles.noteRow}>
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
          </li>
        ))}
      </ul>
      {viewNote && (
        <ViewNoteModal isOpen={!!viewNote} onOpenChange={() => setViewNote(null)} note={viewNote} />
      )}
    </>
  );
}
