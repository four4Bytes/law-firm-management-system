"use client";

import clsx from "clsx";

import { Modal } from "@/components/ui/Modal/Modal";
import { TaskFilesSection } from "@/features/tasks/components/TaskFilesSection/TaskFilesSection";
import { TaskNotesSection } from "@/features/tasks/components/TaskNotesSection/TaskNotesSection";
import { TaskStatusBadge } from "@/features/tasks/components/TaskStatusBadge/TaskStatusBadge";
import { mapReviewersForDisplay } from "@/features/tasks/display";
import { useTaskDocuments } from "@/features/tasks/hooks/useTaskDocuments";
import { useTaskNotes } from "@/features/tasks/hooks/useTaskNotes";
import type { TaskDetailRow } from "@/features/tasks/queries";
import { UserList } from "@/features/users/components/UserList/UserList";

import styles from "./ViewTaskModal.module.css";

interface ViewTaskModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  task: TaskDetailRow;
}

export function ViewTaskModal({ isOpen, onOpenChange, task }: ViewTaskModalProps) {
  const { documents, isLoading: isLoadingDocuments } = useTaskDocuments(task.id);
  const { notes, isLoading: isLoadingNotes } = useTaskNotes(task.id);

  const hasFiles = documents.length > 0;
  const hasNotes = notes.length > 0;
  const noop = () => {};

  return (
    <Modal
      title="Task"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      className={clsx(styles.modal, hasFiles && hasNotes && styles.wide)}
    >
      <div className={styles.columns}>
        <div className={styles.column}>
          <div className={styles.field}>
            <span className={styles.label}>Title</span>
            <span className={styles.value}>{task.title}</span>
          </div>
          {task.description && (
            <div className={styles.field}>
              <span className={styles.label}>Description</span>
              <span className={styles.value}>{task.description}</span>
            </div>
          )}
          <div className={styles.field}>
            <span className={styles.label}>Assignees</span>
            <UserList users={task.assignTo} />
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Reviewers</span>
            <UserList users={mapReviewersForDisplay(task)} />
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Status</span>
            <TaskStatusBadge status={task.status} taskForHint={task} />
          </div>
        </div>

        {(isLoadingDocuments || hasFiles) && (
          <>
            <div className={styles.divider} />
            <div className={styles.column}>
              <div className={clsx(styles.field, styles.fillField)}>
                <span className={styles.label}>Attachments</span>
                <TaskFilesSection taskId={task.id} canEdit={false} onSuccess={noop} readOnly />
              </div>
            </div>
          </>
        )}

        {(isLoadingNotes || hasNotes) && (
          <>
            <div className={styles.divider} />
            <div className={styles.column}>
              <span className={styles.label}>Notes</span>
              <TaskNotesSection taskId={task.id} canEdit={false} onSuccess={noop} readOnly />
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
