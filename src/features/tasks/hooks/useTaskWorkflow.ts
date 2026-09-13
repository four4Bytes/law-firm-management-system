"use client";

import { useState } from "react";

import { reviewTaskAction, submitTaskAction } from "@/features/tasks/actions";
import { getTaskStatusHint } from "@/features/tasks/display";
import type { TaskDetailRow } from "@/features/tasks/queries";
import { TaskAssignmentStatus, TaskStatus } from "@/generated/prisma/browser";
import { toastActionError, toastError, toastSuccess } from "@/lib/toast-utils";

export interface TaskWorkflowInput {
  task: TaskDetailRow;
  currentUserId: string;
  isReviewer: boolean;
  onSuccess: () => void;
}

export interface TaskWorkflow {
  localStatus: TaskStatus;
  statusHint: string;
  assignmentStatuses: Record<string, TaskAssignmentStatus>;
  canToggleOwnSubmission: boolean;
  hasReviewed: boolean;
  isToggling: boolean;
  isReviewing: boolean;
  handleToggleDone: () => Promise<void>;
  handleReview: (decision: "Approved" | "Rejected") => Promise<void>;
}

export function useTaskWorkflow(payload: TaskWorkflowInput): TaskWorkflow {
  const { task, currentUserId, isReviewer, onSuccess } = payload;
  const [assignmentStatuses, setAssignmentStatuses] = useState<
    Record<string, TaskAssignmentStatus>
  >(Object.fromEntries(task.assignTo.map((a) => [a.id, a.status])));
  const [localStatus, setLocalStatus] = useState<TaskStatus>(task.status);
  const [isToggling, setIsToggling] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewedLocally, setReviewedLocally] = useState(false);

  const isCurrentUserAssignee = task.assignee_ids.includes(currentUserId);
  const canToggleOwnSubmission = isCurrentUserAssignee && localStatus !== TaskStatus.Done;
  const currentReviewer = task.reviewers.find((r) => r.reviewer_user_id === currentUserId);
  const hasReviewed = !!currentReviewer?.reviewed_at || reviewedLocally;
  const statusHint = getTaskStatusHint({
    status: localStatus,
    assignTo: Object.values(assignmentStatuses).map((status) => ({ status })),
    reviewers: task.reviewers,
  });

  async function handleToggleDone(): Promise<void> {
    if (!canToggleOwnSubmission || isToggling) return;
    const current = assignmentStatuses[currentUserId];
    const next =
      current === TaskAssignmentStatus.Done ? TaskAssignmentStatus.Todo : TaskAssignmentStatus.Done;
    setIsToggling(true);
    const prev = current;
    setAssignmentStatuses((p) => ({ ...p, [currentUserId]: next }));
    try {
      const result = await submitTaskAction({ taskId: task.id, status: next });
      if (!result.success) {
        setAssignmentStatuses((p) => ({ ...p, [currentUserId]: prev }));
        toastActionError(result, "submit task");
      } else {
        toastSuccess(
          next === TaskAssignmentStatus.Done ? "Marked done" : "Undone",
          next === TaskAssignmentStatus.Done
            ? "Your work is marked done."
            : "Your work is back to todo.",
        );
        if (result.data?.taskStatus) setLocalStatus(result.data.taskStatus);
        onSuccess();
      }
    } catch {
      setAssignmentStatuses((p) => ({ ...p, [currentUserId]: prev }));
      toastError(
        "Failed to submit task",
        "Something went wrong while submitting. Please try again.",
      );
    } finally {
      setIsToggling(false);
    }
  }

  async function handleReview(decision: "Approved" | "Rejected"): Promise<void> {
    if (!isReviewer || hasReviewed || localStatus !== TaskStatus.InReview || isReviewing) return;
    setIsReviewing(true);
    try {
      const result = await reviewTaskAction({ taskId: task.id, decision });
      if (!result.success) {
        toastActionError(result, "record review");
      } else {
        toastSuccess(
          decision === "Approved" ? "Approved" : "Changes requested",
          decision === "Approved" ? "You approved this task." : "You requested changes.",
        );
        setReviewedLocally(true);
        const taskStatus =
          result.data?.taskStatus ??
          (decision === "Rejected" ? TaskStatus.Pending : TaskStatus.Done);
        setLocalStatus(taskStatus);
        onSuccess();
      }
    } catch {
      toastError(
        "Failed to record review",
        "Something went wrong while recording your review. Please try again.",
      );
    } finally {
      setIsReviewing(false);
    }
  }

  return {
    localStatus,
    statusHint,
    assignmentStatuses,
    canToggleOwnSubmission,
    hasReviewed,
    isToggling,
    isReviewing,
    handleToggleDone,
    handleReview,
  };
}
