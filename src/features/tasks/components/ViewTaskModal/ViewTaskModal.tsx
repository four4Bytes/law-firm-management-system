"use client";

import clsx from "clsx";

import { Modal } from "@/components/ui/Modal/Modal";
import { TaskFilesSection } from "@/features/tasks/components/TaskFilesSection/TaskFilesSection";
import { TaskNotesSection } from "@/features/tasks/components/TaskNotesSection/TaskNotesSection";
import { TaskStatusBadge } from "@/features/tasks/components/TaskStatusBadge/TaskStatusBadge";
import { resolveAssigneeDisplayRows, resolveReviewerDisplayRows } from "@/features/tasks/display";
import type { TaskDetailRow } from "@/features/tasks/queries";
import { UserList } from "@/features/users/components/UserList/UserList";

import styles from "./ViewTaskModal.module.css";

interface ViewTaskModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  task: TaskDetailRow;
}

export function ViewTaskModal({ isOpen, onOpenChange, task }: ViewTaskModalProps) {
  const hasFiles = true;
  const hasNotes = true;
  const noop = () => {};
  const assigneeRows = resolveAssigneeDisplayRows({
    users: task.assignTo.map((assignee) => ({
      id: assignee.id,
      name: assignee.name,
      is_online: false,
    })),
    selectedIds: new Set(task.assignTo.map((assignee) => assignee.id)),
    snapshot: task.assignTo,
  });
  const reviewerRows = resolveReviewerDisplayRows({
    users: task.reviewers.map((reviewer) => ({
      id: reviewer.reviewer_user_id,
      name: reviewer.name,
      is_online: false,
    })),
    selectedIds: new Set(task.reviewers.map((reviewer) => reviewer.reviewer_user_id)),
    snapshot: task.reviewers,
    createdByUserId: task.created_by_user_id,
  });

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
            <UserList users={assigneeRows} />
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Reviewers</span>
            <UserList users={reviewerRows} />
          </div>
          <div className={clsx(styles.field, styles.fieldInline)}>
            <span className={styles.label}>Status</span>
            <TaskStatusBadge status={task.status} taskForHint={task} />
          </div>
        </div>

        <div className={styles.divider} />
        <div className={styles.column}>
          <div className={clsx(styles.field, styles.fillField)}>
            <span className={styles.label}>Attachments</span>
            <TaskFilesSection taskId={task.id} canEdit={false} onSuccess={noop} readOnly />
          </div>
        </div>

        <div className={styles.divider} />
        <div className={styles.column}>
          <div className={clsx(styles.field, styles.fillField)}>
            <span className={styles.label}>Notes</span>
            <TaskNotesSection taskId={task.id} canEdit={false} onSuccess={noop} readOnly />
          </div>
        </div>
      </div>
    </Modal>
  );
}
