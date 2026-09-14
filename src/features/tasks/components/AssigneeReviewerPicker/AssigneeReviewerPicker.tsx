"use client";

import { useMemo } from "react";

import { resolveAssigneeDisplayRows, resolveReviewerDisplayRows } from "@/features/tasks/display";
import type { ActiveUserSummary, TaskDetailRow } from "@/features/tasks/queries";
import { UserList } from "@/features/users/components/UserList/UserList";
import { UserSelect } from "@/features/users/components/UserSelect/UserSelect";

import styles from "./AssigneeReviewerPicker.module.css";

const EMPTY_ASSIGNEE_SNAPSHOT: TaskDetailRow["assignTo"] = [];
const EMPTY_REVIEWER_SNAPSHOT: TaskDetailRow["reviewers"] = [];

export interface AssigneeReviewerPickerProps {
  users: ActiveUserSummary[];
  assigneeIds: Set<string>;
  onAssigneeIdsChange: (ids: Set<string>) => void;
  reviewerIds: Set<string>;
  onReviewerIdsChange: (ids: Set<string>) => void;
  assigneeSnapshot?: TaskDetailRow["assignTo"];
  reviewerSnapshot?: TaskDetailRow["reviewers"];
  createdByUserId?: string;
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
  assigneeSnapshot = EMPTY_ASSIGNEE_SNAPSHOT,
  reviewerSnapshot = EMPTY_REVIEWER_SNAPSHOT,
  createdByUserId,
  isAssigneeDisabled,
  isReviewerDisabled,
  assigneeLabel = "Assignees",
  reviewerLabel = "Reviewers",
  validate,
}: AssigneeReviewerPickerProps) {
  const assigneeRows = useMemo(
    () =>
      resolveAssigneeDisplayRows({ users, selectedIds: assigneeIds, snapshot: assigneeSnapshot }),
    [users, assigneeIds, assigneeSnapshot],
  );
  const reviewerRows = useMemo(
    () =>
      resolveReviewerDisplayRows({
        users,
        selectedIds: reviewerIds,
        snapshot: reviewerSnapshot,
        createdByUserId,
      }),
    [users, reviewerIds, reviewerSnapshot, createdByUserId],
  );

  return (
    <div className={styles.picker}>
      <div className={styles.role}>
        <UserSelect
          users={users}
          selectedIds={assigneeIds}
          onChange={onAssigneeIdsChange}
          isDisabled={isAssigneeDisabled}
          label={assigneeLabel}
          disabledKeys={reviewerIds}
          validate={validate}
        />
        <UserList users={assigneeRows} emptyText="No assignees" />
      </div>
      <div className={styles.role}>
        <UserSelect
          users={users}
          selectedIds={reviewerIds}
          onChange={onReviewerIdsChange}
          isDisabled={isReviewerDisabled}
          label={reviewerLabel}
          placeholder="Select reviewers..."
          disabledKeys={assigneeIds}
        />
        <UserList users={reviewerRows} emptyText="No reviewers" />
      </div>
    </div>
  );
}
