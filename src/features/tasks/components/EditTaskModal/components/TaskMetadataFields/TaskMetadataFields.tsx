"use client";

import { TextField } from "@/components/ui/TextField/TextField";
import type { TaskCapabilities } from "@/features/tasks/actions";
import { AssigneeReviewerPicker } from "@/features/tasks/components/AssigneeReviewerPicker/AssigneeReviewerPicker";
import type { TaskDetailRow } from "@/features/tasks/queries";
import { TaskUpdatePayloadSchema } from "@/features/tasks/schemas";
import type { ActiveUserSummary } from "@/features/users/queries";
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
  isPending: boolean;
  fieldValidator?: (value: unknown) => string | null;
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
  isPending,
  fieldValidator,
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
      <AssigneeReviewerPicker
        users={users}
        assigneeIds={assigneeIds}
        onAssigneeIdsChange={onAssigneeIdsChange}
        reviewerIds={reviewerIds}
        onReviewerIdsChange={onReviewerIdsChange}
        assigneeSnapshot={task.assignTo}
        reviewerSnapshot={task.reviewers}
        creatorUserId={task.created_by_user_id}
        isAssigneeDisabled={isPending || !capabilities.canEdit}
        isReviewerDisabled={isPending || !capabilities.canManageReviewers}
        validate={fieldValidator}
      />
    </>
  );
}
