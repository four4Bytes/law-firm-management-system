"use client";

import { useMemo } from "react";

import {
  resolveAssigneeDisplayRows,
  resolveReviewerDisplayRows,
  withLockedReviewer,
} from "@/features/tasks/display";
import type { TaskDetailRow } from "@/features/tasks/queries";
import { UserList } from "@/features/users/components/UserList/UserList";
import { UserSelect } from "@/features/users/components/UserSelect/UserSelect";
import type { ActiveUserSummary } from "@/features/users/queries";

import styles from "./AssigneeReviewerPicker.module.css";

const EMPTY_ASSIGNEE_SNAPSHOT: TaskDetailRow["assignTo"] = [];
const EMPTY_REVIEWER_SNAPSHOT: TaskDetailRow["reviewers"] = [];

export interface AssigneeReviewerPickerProps {
  users: ActiveUserSummary[];
  assigneeIds: Set<string>;
  onAssigneeIdsChange: (ids: Set<string>) => void;
  reviewerIds: Set<string>;
  onReviewerIdsChange: (ids: Set<string>) => void;
  creatorUserId: string;
  assigneeSnapshot?: TaskDetailRow["assignTo"];
  reviewerSnapshot?: TaskDetailRow["reviewers"];
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
  creatorUserId,
  assigneeSnapshot = EMPTY_ASSIGNEE_SNAPSHOT,
  reviewerSnapshot = EMPTY_REVIEWER_SNAPSHOT,
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
        createdByUserId: creatorUserId,
      }),
    [users, reviewerIds, reviewerSnapshot, creatorUserId],
  );
  const assigneeDisabledKeys = useMemo(
    () => new Set([...reviewerIds, creatorUserId]),
    [reviewerIds, creatorUserId],
  );
  const reviewerDisabledKeys = useMemo(
    () => new Set([...assigneeIds, creatorUserId]),
    [assigneeIds, creatorUserId],
  );

  function handleReviewerIdsChange(next: Set<string>): void {
    onReviewerIdsChange(withLockedReviewer(next, creatorUserId));
  }

  return (
    <div className={styles.picker}>
      <div className={styles.role}>
        <UserSelect
          users={users}
          selectedIds={assigneeIds}
          onChange={onAssigneeIdsChange}
          isDisabled={isAssigneeDisabled}
          label={assigneeLabel}
          disabledKeys={assigneeDisabledKeys}
          validate={validate}
        />
        <UserList users={assigneeRows} emptyText="No assignees" />
      </div>
      <div className={styles.role}>
        <UserSelect
          users={users}
          selectedIds={reviewerIds}
          onChange={handleReviewerIdsChange}
          isDisabled={isReviewerDisabled}
          label={reviewerLabel}
          placeholder="Select reviewers..."
          disabledKeys={reviewerDisabledKeys}
        />
        <UserList users={reviewerRows} emptyText="No reviewers" />
      </div>
    </div>
  );
}
