"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";
import { queue } from "@/components/ui/Toast/Toast";
import { getDocumentsPaginatedAction } from "@/features/documents/actions";
import { FileList } from "@/features/documents/components/FileList/FileList";
import type { DocumentRow } from "@/features/documents/queries";
import type { TaskDetailRow } from "@/features/tasks/queries";

import styles from "./TaskViewModal.module.css";

interface TaskViewModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  task: TaskDetailRow;
}

export function TaskViewModal({ isOpen, onOpenChange, task }: TaskViewModalProps) {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
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

    void loadDocuments();

    return () => {
      cancelled = true;
    };
  }, [task.id]);

  return (
    <Modal title="Task" isOpen={isOpen} onOpenChange={onOpenChange} className={styles.modal}>
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
        {task.assignTo && (
          <div className={styles.field}>
            <span className={styles.label}>Assignees</span>
            <span>{task.assignTo}</span>
          </div>
        )}
        {task.reviewers.length > 0 && (
          <div className={styles.field}>
            <span className={styles.label}>Reviewers</span>
            <ul className={styles.list}>
              {task.reviewers.map((r) => (
                <li key={r.id}>
                  {r.name}
                  {r.decision !== "Pending" && ` — ${r.decision}`}
                </li>
              ))}
            </ul>
          </div>
        )}
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

      <div className={styles.actions}>
        <Button variant="secondary" type="button" onPress={() => onOpenChange(false)}>
          Close
        </Button>
      </div>
    </Modal>
  );
}
