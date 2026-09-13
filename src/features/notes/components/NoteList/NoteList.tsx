"use client";

import { useEffect, useRef, useState } from "react";
import { FaEye, FaPen, FaRegNoteSticky, FaXmark } from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";
import { ProgressCircle } from "@/components/ui/ProgressCircle/ProgressCircle";
import { ViewNoteModal } from "@/features/notes/components/ViewNoteModal/ViewNoteModal";
import type { NoteRow } from "@/features/notes/queries";

import styles from "./NoteList.module.css";

interface NoteListProps {
  notes: NoteRow[];
  onEdit?: (note: NoteRow) => void;
  onDelete?: (noteId: string) => void;
  isLoading?: boolean;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
}

export function NoteList({
  notes,
  onEdit,
  onDelete,
  isLoading,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: NoteListProps) {
  const [viewNote, setViewNote] = useState<NoteRow | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const sentinelRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (!hasMore || !onLoadMore) return;
    const list = listRef.current;
    const sentinel = sentinelRef.current;
    if (!list || !sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) onLoadMore();
      },
      { root: list },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore]);

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <ProgressCircle aria-label="Loading notes" />
      </div>
    );
  }

  if (notes.length === 0) return null;

  return (
    <>
      <ul ref={listRef} className={styles.noteList}>
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
        {hasMore && (
          <li ref={sentinelRef} className={styles.loadMoreRow} aria-hidden="true">
            {isLoadingMore && <ProgressCircle aria-label="Loading more notes" />}
          </li>
        )}
      </ul>
      {viewNote && (
        <ViewNoteModal isOpen={!!viewNote} onOpenChange={() => setViewNote(null)} note={viewNote} />
      )}
    </>
  );
}
