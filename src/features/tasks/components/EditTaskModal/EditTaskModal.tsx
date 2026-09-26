"use client";

import clsx from "clsx";
import { useState } from "react";
import { Form } from "react-aria-components";

import { Button } from "@/components/ui/Button/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog/ConfirmDialog";
import { Modal } from "@/components/ui/Modal/Modal";
import { Separator } from "@/components/ui/Separator/Separator";
import {
  reopenTaskAction,
  updateTaskAction,
  type TaskCapabilities,
} from "@/features/tasks/actions";
import { TaskFilesSection } from "@/features/tasks/components/TaskFilesSection/TaskFilesSection";
import { TaskNotesSection } from "@/features/tasks/components/TaskNotesSection/TaskNotesSection";
import { withLockedReviewer } from "@/features/tasks/display";
import { useTaskWorkflow } from "@/features/tasks/hooks/useTaskWorkflow";
import type { TaskDetailRow } from "@/features/tasks/queries";
import { TaskCreatePayloadSchema, TaskUpdatePayloadSchema } from "@/features/tasks/schemas";
import type { ActiveUserSummary } from "@/features/users/queries";
import { toastActionError, toastError, toastSuccess } from "@/lib/hooks/toast-utils";
import {
  createFieldValidator,
  firstIssueMessage,
  optionalString,
  requiredString,
} from "@/lib/validation/form-utils";

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
  const [reviewerIds, setReviewerIds] = useState<Set<string>>(() =>
    withLockedReviewer(
      new Set(task.reviewers.map((r) => r.reviewer_user_id)),
      task.created_by_user_id,
    ),
  );
  const [isPending, setIsPending] = useState(false);
  const [isReopening, setIsReopening] = useState(false);
  const [isReopenPending, setIsReopenPending] = useState(false);

  const workflow = useTaskWorkflow({
    task,
    currentUserId,
    isReviewer: capabilities.isReviewer,
    onSuccess,
  });

  const initialAssigneeIds = new Set(task.assignee_ids);
  const initialReviewerIds = withLockedReviewer(
    new Set(task.reviewers.map((r) => r.reviewer_user_id)),
    task.created_by_user_id,
  );
  const contentChanged = title !== task.title || description !== (task.description ?? "");
  const rosterChanged =
    capabilities.canEditRoster &&
    (assigneeIds.size !== initialAssigneeIds.size ||
      reviewerIds.size !== initialReviewerIds.size ||
      [...assigneeIds].some((id) => !initialAssigneeIds.has(id)) ||
      [...reviewerIds].some((id) => !initialReviewerIds.has(id)));
  const isDirty = contentChanged || rosterChanged;

  function handleCancel() {
    if (isPending) return;
    onOpenChange(false);
  }

  async function handleReopen() {
    if (isReopening) return;
    setIsReopening(true);

    try {
      const result = await reopenTaskAction({ taskId: task.id });
      if (!result.success) {
        toastActionError(result, "reopen task");
        return;
      }
      toastSuccess(
        "Task reopened",
        "All reviewer approvals were reset to pending and all assignee marks to not started.",
      );
      onOpenChange(false);
      onSuccess();
    } catch {
      toastError(
        "Unexpected error",
        "Something went wrong while reopening the task. Please try again.",
      );
    } finally {
      setIsReopening(false);
    }
  }

  async function handleSave(event: React.SyntheticEvent) {
    event.preventDefault();
    if (isPending) return;
    setIsPending(true);

    try {
      if (capabilities.canEdit) {
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
            firstIssueMessage(
              parsed.error,
              "Please review the highlighted form fields and try again.",
            ),
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
              onReviewerIdsChange={setReviewerIds}
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

          <Separator orientation="vertical" className={styles.divider} />

          <div className={styles.column}>
            <TaskFilesSection
              taskId={task.id}
              canEdit={capabilities.canEdit}
              onSuccess={onSuccess}
            />
          </div>

          <Separator orientation="vertical" className={styles.divider} />

          <div className={styles.column}>
            <TaskNotesSection
              taskId={task.id}
              canEdit={capabilities.canEdit}
              onSuccess={onSuccess}
            />
          </div>
        </div>

        <div className={styles.actions}>
          {capabilities.canReopen && (
            <Button
              variant="secondary"
              type="button"
              onPress={() => setIsReopenPending(true)}
              isDisabled={isPending || isReopening}
              isPending={isReopening}
            >
              Reopen task
            </Button>
          )}
          <Button variant="secondary" type="button" onPress={handleCancel} isDisabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" isDisabled={isPending || !isDirty} isPending={isPending}>
            Save
          </Button>
        </div>
      </Form>
      <ConfirmDialog
        isOpen={isReopenPending}
        onOpenChange={(open) => {
          if (!open) setIsReopenPending(false);
        }}
        title="Reopen task"
        confirmLabel="Reopen"
        onConfirm={() => {
          setIsReopenPending(false);
          void handleReopen();
        }}
      >
        Reopening resets every reviewer&apos;s approval to pending and every assignee&apos;s mark to
        not started. The title, description, notes, and files are kept.
      </ConfirmDialog>
    </Modal>
  );
}
