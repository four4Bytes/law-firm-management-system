"use client";

import { TextField } from "@/components/ui/TextField/TextField";
import type { TaskCapabilities } from "@/features/tasks/actions";
import type { ActiveUserSummary, TaskDetailRow } from "@/features/tasks/queries";
import { TaskUpdatePayloadSchema } from "@/features/tasks/schemas";
import { UserList } from "@/features/users/components/UserList/UserList";
import { UserSelect } from "@/features/users/components/UserSelect/UserSelect";
import { TaskStatus } from "@/generated/prisma/browser";
import { createFieldValidator } from "@/lib/form-utils";

export interface TaskMetadataFieldsProps {
  task: TaskDetailRow;
  users: ActiveUserSummary[];
  capabilities: TaskCapabilities;
  title: string;
  onTitleChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  assigneeIds: Set<string>;
  onAssigneeIdsChange: (ids: Set<string>) => void;
  reviewerIds: Set<string>;
  onReviewerIdsChange: (ids: Set<string>) => void;
  localStatus: TaskStatus;
  isPending: boolean;
}

export function TaskMetadataFields({
  task,
  users,
  capabilities,
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  assigneeIds,
  onAssigneeIdsChange,
  reviewerIds,
  onReviewerIdsChange,
  localStatus,
  isPending,
}: TaskMetadataFieldsProps) {
  return (
    <>
      <TextField
        label="Title"
        value={title}
        onChange={onTitleChange}
        placeholder="Enter task title..."
        validate={createFieldValidator(TaskUpdatePayloadSchema.shape.title)}
        isDisabled={isPending || !capabilities.canEdit}
      />
      <TextField
        label="Description"
        isTextArea
        rows={3}
        value={description}
        onChange={onDescriptionChange}
        placeholder="Optional description..."
        validate={createFieldValidator(TaskUpdatePayloadSchema.shape.description)}
        isDisabled={isPending || !capabilities.canEdit}
      />
      <UserSelect
        users={users}
        selectedIds={assigneeIds}
        onChange={onAssigneeIdsChange}
        isDisabled={isPending || !capabilities.isCreator}
        label="Assignees"
        hideSelected
        disabledKeys={reviewerIds}
      />
      <UserList users={task.assignTo} />

      <UserSelect
        users={users}
        selectedIds={reviewerIds}
        onChange={(next) => {
          if (localStatus === TaskStatus.Done && next.size > reviewerIds.size) {
            const confirmed = window.confirm(
              "This will reopen the completed task and reset all approvals to Pending. Continue?",
            );
            if (!confirmed) return;
          }
          onReviewerIdsChange(next);
        }}
        isDisabled={isPending || !capabilities.canManageReviewers}
        label="Reviewers"
        hideSelected
        disabledKeys={assigneeIds}
      />
      <UserList
        users={task.reviewers.map((r) => ({
          id: r.id,
          name: r.reviewer_user_id === task.created_by_user_id ? `${r.name} (creator)` : r.name,
          status: r.decision,
        }))}
      />
    </>
  );
}
