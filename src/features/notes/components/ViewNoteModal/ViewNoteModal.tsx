"use client";

import { Modal } from "@/components/ui/Modal/Modal";
import type { NoteRow } from "@/features/notes/queries";
import { formatDateTime } from "@/lib/date";

import styles from "./ViewNoteModal.module.css";

interface ViewNoteModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  note: NoteRow;
}

export function ViewNoteModal({ isOpen, onOpenChange, note }: ViewNoteModalProps) {
  return (
    <Modal
      title="Note Details"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      className={styles.modal}
    >
      <div className={styles.content}>
        <div className={styles.meta}>
          {note.author} · {formatDateTime(note.created_at)}
        </div>
        <p className={styles.body}>{note.content}</p>
      </div>
    </Modal>
  );
}
