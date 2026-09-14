"use client";

import clsx from "clsx";

import { Button } from "@/components/ui/Button/Button";
import { TaskStatusBadge } from "@/features/tasks/components/TaskStatusBadge/TaskStatusBadge";
import type { TaskWorkflow } from "@/features/tasks/hooks/useTaskWorkflow";
import { TaskAssignmentStatus, TaskStatus } from "@/generated/prisma/browser";

import styles from "./TaskWorkflowSection.module.css";

export interface TaskWorkflowSectionProps {
  workflow: TaskWorkflow;
  currentUserId: string;
  showWorkAction: boolean;
  showReviewActions: boolean;
}

export function TaskWorkflowSection({
  workflow,
  currentUserId,
  showWorkAction,
  showReviewActions,
}: TaskWorkflowSectionProps) {
  const {
    localStatus,
    statusHint,
    assignmentStatuses,
    canToggleOwnSubmission,
    hasReviewed,
    isToggling,
    isReviewing,
    handleToggleDone,
    handleReview,
  } = workflow;
  const isDone = assignmentStatuses[currentUserId] === TaskAssignmentStatus.Done;

  return (
    <>
      <div className={clsx(styles.section, styles.sectionInline)}>
        <span className={styles.label}>Status</span>
        <TaskStatusBadge status={localStatus} hint={statusHint} />
      </div>

      {showWorkAction && (
        <div className={styles.section}>
          <span className={styles.label}>Your work</span>
          <Button
            variant={isDone ? "secondary" : "primary"}
            type="button"
            isDisabled={isToggling || !canToggleOwnSubmission}
            isPending={isToggling}
            onPress={handleToggleDone}
          >
            {isDone ? "Undo" : "Mark done"}
          </Button>
        </div>
      )}

      {showReviewActions && (
        <div className={styles.section}>
          <span className={styles.label}>Review</span>
          <div className={styles.reviewActions}>
            <Button
              variant="secondary"
              type="button"
              isDisabled={isReviewing || hasReviewed || localStatus !== TaskStatus.InReview}
              isPending={isReviewing}
              onPress={() => handleReview("Approved")}
            >
              Approve
            </Button>
            <Button
              variant="secondary"
              type="button"
              isDisabled={isReviewing || hasReviewed || localStatus !== TaskStatus.InReview}
              isPending={isReviewing}
              onPress={() => handleReview("Rejected")}
            >
              Request changes
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
