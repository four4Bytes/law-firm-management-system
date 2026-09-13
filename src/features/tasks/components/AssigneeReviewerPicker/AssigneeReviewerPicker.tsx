"use client";

import type { ActiveUserSummary } from "@/features/tasks/queries";
import { UserSelect } from "@/features/users/components/UserSelect/UserSelect";

export interface AssigneeReviewerPickerProps {
  users: ActiveUserSummary[];
  assigneeIds: Set<string>;
  onAssigneeIdsChange: (ids: Set<string>) => void;
  reviewerIds: Set<string>;
  onReviewerIdsChange: (ids: Set<string>) => void;
  isAssigneeDisabled: boolean;
  isReviewerDisabled: boolean;
  assigneeLabel?: string;
  reviewerLabel?: string;
  validate?: (value: string[]) => string | null;
}

export function AssigneeReviewerPicker({
  users,
  assigneeIds,
  onAssigneeIdsChange,
  reviewerIds,
  onReviewerIdsChange,
  isAssigneeDisabled,
  isReviewerDisabled,
  assigneeLabel = "Assignees",
  reviewerLabel = "Reviewers",
  validate,
}: AssigneeReviewerPickerProps) {
  return (
    <>
      <UserSelect
        users={users}
        selectedIds={assigneeIds}
        onChange={onAssigneeIdsChange}
        isDisabled={isAssigneeDisabled}
        label={assigneeLabel}
        hideSelected
        disabledKeys={reviewerIds}
        validate={validate}
      />
      <UserSelect
        users={users}
        selectedIds={reviewerIds}
        onChange={onReviewerIdsChange}
        isDisabled={isReviewerDisabled}
        label={reviewerLabel}
        hideSelected
        disabledKeys={assigneeIds}
      />
    </>
  );
}
