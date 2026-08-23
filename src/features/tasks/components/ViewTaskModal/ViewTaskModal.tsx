"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";
import { queue } from "@/components/ui/Toast/Toast";
import { getDocumentsPaginatedAction } from "@/features/documents/actions";
import { FileList } from "@/features/documents/components/FileList/FileList";
import type { DocumentRow } from "@/features/documents/queries";
import { getTaskNotesAction } from "@/features/notes/actions";
import { NoteList } from "@/features/notes/components/NoteList/NoteList";
import type { NoteRow } from "@/features/notes/queries";
import type { TaskDetailRow } from "@/features/tasks/queries";

import styles from "./ViewTaskModal.module.css";

interface ViewTaskModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  task: TaskDetailRow;
}

export function ViewTaskModal({ isOpen, onOpenChange, task }: ViewTaskModalProps) {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadDocuments() {
      try {
        const { rows } = await getDocumentsPaginatedAction({ taskId: task.id, pageSize: 100 });
        if (cancelled) return;
        setDocuments(rows);
      } catch {
        if (cancelled) return;
        queue.add({ title: "Failed to load attachments" }, { timeout: 5000 });
      } finally {
        if (!cancelled) setIsLoadingDocuments(false);
      }
    }

    async function loadNotes() {
      try {
        const rows = await getTaskNotesAction(task.id);
        if (cancelled) return;
        setNotes(rows);
      } catch {
        if (cancelled) return;
        queue.add({ title: "Failed to load notes" }, { timeout: 5000 });
      }
    }

    void loadDocuments();
    void loadNotes();

    return () => {
      cancelled = true;
    };
  }, [task.id]);

  const hasFiles = documents.length > 0;
  const hasNotes = notes.length > 0;

  return (
    <Modal title="Task" isOpen={isOpen} onOpenChange={onOpenChange} className={styles.modal}>
      <div className={styles.columns}>
        <div className={styles.column}>
          <div className={styles.field}>
            <span className={styles.label}>Title</span>
            <span>{task.title}</span>
          </div>
          {task.description && (
            <div className={styles.field}>
              <span className={styles.label}>Description</span>
              <span>{task.description}</span>
            </div>
          )}
          <div className={styles.field}>
            <span className={styles.label}>Assignees</span>
            <span>{task.assignTo}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Reviewers</span>
            {task.reviewers.length > 0 ? (
              <ul className={styles.list}>
                {task.reviewers.map((r) => (
                  <li key={r.id}>
                    {r.name}
                    {r.decision !== "Pending" && ` — ${r.decision}`}
                  </li>
                ))}
              </ul>
            ) : (
              <span>—</span>
            )}
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Status</span>
            <span>{task.status}</span>
          </div>
        </div>

        {hasFiles && (
          <>
            <div className={styles.divider} />
            <div className={styles.column}>
              <div className={styles.field}>
                <span className={styles.label}>Attachments</span>
                <FileList
                  entries={[]}
                  isBusy={false}
                  onRemove={() => {}}
                  existingDocuments={documents}
                  isLoading={isLoadingDocuments}
                />
              </div>
            </div>
          </>
        )}

        {hasNotes && (
          <>
            <div className={styles.divider} />
            <div className={styles.column}>
              <span className={styles.label}>Notes</span>
              <NoteList notes={notes} />
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
