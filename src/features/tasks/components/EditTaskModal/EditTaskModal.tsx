"use client";

import clsx from "clsx";
import { useState } from "react";
import { Form } from "react-aria-components";

import { Button } from "@/components/ui/Button/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog/ConfirmDialog";
import { Modal } from "@/components/ui/Modal/Modal";
import { updateTaskAction, type TaskCapabilities } from "@/features/tasks/actions";
import { TaskFilesSection } from "@/features/tasks/components/TaskFilesSection/TaskFilesSection";
import { TaskNotesSection } from "@/features/tasks/components/TaskNotesSection/TaskNotesSection";
import { useTaskWorkflow } from "@/features/tasks/hooks/useTaskWorkflow";
import type { ActiveUserSummary, TaskDetailRow } from "@/features/tasks/queries";
import { TaskCreatePayloadSchema, TaskUpdatePayloadSchema } from "@/features/tasks/schemas";
import { TaskStatus } from "@/generated/prisma/browser";
import { createFieldValidator, optionalString, requiredString } from "@/lib/form-utils";
import { toastActionError, toastError, toastSuccess } from "@/lib/toast-utils";

import { TaskMetadataFields } from "./components/TaskMetadataFields/TaskMetadataFields";
import { TaskWorkflowSection } from "./components/TaskWorkflowSection/TaskWorkflowSection";
import styles from "./EditTaskModal.module.css";

interface EditTaskModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void;
  task: TaskDetailRow;
  capabilities: TaskCapabilities;
  users: ActiveUserSummary[];
  currentUserId: string;
}

export function EditTaskModal({
  isOpen,
  onOpenChange,
  onSuccess,
  task,
  capabilities,
  users,
  currentUserId,
}: EditTaskModalProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [assigneeIds, setAssigneeIds] = useState<Set<string>>(new Set(task.assignee_ids));
  const [reviewerIds, setReviewerIds] = useState<Set<string>>(
    new Set(task.reviewers.map((r) => r.reviewer_user_id)),
  );
  const [isPending, setIsPending] = useState(false);
  const [pendingReviewerIds, setPendingReviewerIds] = useState<Set<string> | null>(null);

  const workflow = useTaskWorkflow({
    task,
    currentUserId,
    isReviewer: capabilities.isReviewer,
    onSuccess,
  });

  function handleReviewerIdsChange(next: Set<string>): void {
    if (workflow.localStatus === TaskStatus.Done && next.size > reviewerIds.size) {
      setPendingReviewerIds(next);
      return;
    }
    setReviewerIds(next);
  }

  const initialAssigneeIds = new Set(task.assignee_ids);
  const initialReviewerIds = new Set(task.reviewers.map((r) => r.reviewer_user_id));
  const isDirty =
    title !== task.title ||
    description !== (task.description ?? "") ||
    assigneeIds.size !== initialAssigneeIds.size ||
    reviewerIds.size !== initialReviewerIds.size ||
    [...assigneeIds].some((id) => !initialAssigneeIds.has(id)) ||
    [...reviewerIds].some((id) => !initialReviewerIds.has(id));

  function handleCancel() {
    if (isPending) return;
    onOpenChange(false);
  }

  async function handleSave(event: React.SyntheticEvent) {
    event.preventDefault();
    if (isPending) return;
    setIsPending(true);

    try {
      if (capabilities.canEdit || capabilities.canManageReviewers) {
        const current = new Set(task.reviewers.map((r) => r.reviewer_user_id));
        const addedReviewers = [...reviewerIds].filter((id) => !current.has(id));
        const removedReviewers = [...current].filter((id) => !reviewerIds.has(id));

        const parsed = TaskUpdatePayloadSchema.safeParse({
          taskId: task.id,
          title: requiredString(title),
          description: optionalString(description),
          assignee_ids: Array.from(assigneeIds),
          reviewer_ids: addedReviewers.length > 0 ? addedReviewers : undefined,
          removed_reviewer_ids: removedReviewers.length > 0 ? removedReviewers : undefined,
        });
        if (!parsed.success) {
          toastError(
            "Failed to update task",
            "Please review the highlighted form fields and try again.",
          );
          return;
        }
        const result = await updateTaskAction(parsed.data);
        if (!result.success) {
          toastActionError(result, "update task");
          return;
        }
      }

      toastSuccess("Task updated", "The task details were saved.");
      onOpenChange(false);
      onSuccess();
    } catch {
      toastError(
        "Unexpected error",
        "Something went wrong while updating the task. Please try again.",
      );
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Modal title="Task" isOpen={isOpen} onOpenChange={handleCancel} className={styles.modal}>
      {workflow.localStatus === TaskStatus.Done && (
        <div className={styles.banner}>
          Completed — editing locked. To reopen, add a new reviewer (resets to Pending).
        </div>
      )}
      <Form onSubmit={handleSave} validationBehavior="native" className={styles.form}>
        <div className={styles.columns}>
          <div className={clsx(styles.column, styles.columnScroll)}>
            <TaskMetadataFields
              task={task}
              users={users}
              capabilities={capabilities}
              title={title}
              onTitleChange={setTitle}
              description={description}
              onDescriptionChange={setDescription}
              assigneeIds={assigneeIds}
              onAssigneeIdsChange={setAssigneeIds}
              reviewerIds={reviewerIds}
              onReviewerIdsChange={handleReviewerIdsChange}
              isPending={isPending}
              fieldValidator={createFieldValidator(TaskCreatePayloadSchema.shape.assignee_ids)}
            />
            <TaskWorkflowSection
              workflow={workflow}
              currentUserId={currentUserId}
              showWorkAction={task.assignee_ids.includes(currentUserId)}
              showReviewActions={capabilities.isReviewer}
            />
          </div>

          <div className={styles.divider} />

          <div className={styles.column}>
            <TaskFilesSection
              taskId={task.id}
              canEdit={capabilities.canEdit}
              onSuccess={onSuccess}
              readOnly={workflow.localStatus === TaskStatus.Done}
            />
          </div>

          <div className={styles.divider} />

          <div className={styles.column}>
            <TaskNotesSection
              taskId={task.id}
              canEdit={capabilities.canEdit}
              onSuccess={onSuccess}
              readOnly={workflow.localStatus === TaskStatus.Done}
            />
          </div>
        </div>

        <div className={styles.actions}>
          <Button variant="secondary" type="button" onPress={handleCancel} isDisabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" isDisabled={isPending || !isDirty} isPending={isPending}>
            Save
          </Button>
        </div>
      </Form>
      <ConfirmDialog
        isOpen={pendingReviewerIds !== null}
        onOpenChange={(open) => {
          if (!open) setPendingReviewerIds(null);
        }}
        title="Reopen task"
        confirmLabel="Reopen"
        onConfirm={() => {
          if (pendingReviewerIds) setReviewerIds(pendingReviewerIds);
          setPendingReviewerIds(null);
        }}
      >
        This will reopen the completed task and reset all approvals to Pending. Continue?
      </ConfirmDialog>
    </Modal>
  );
}
