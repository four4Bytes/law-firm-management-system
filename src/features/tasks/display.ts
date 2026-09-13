import type { StatusBadgeVariant } from "@/components/ui/StatusBadge/StatusBadge";
import type { TaskDetailRow } from "@/features/tasks/queries";
import { ReviewDecision, TaskAssignmentStatus, TaskStatus } from "@/generated/prisma/browser";

export interface TaskStatusHintInput {
  status: TaskStatus;
  assignTo: { status: TaskAssignmentStatus }[];
  reviewers: { decision: ReviewDecision }[];
}

export function getTaskStatusVariant(status: TaskStatus): StatusBadgeVariant {
  if (status === TaskStatus.Pending) return "pending";
  if (status === TaskStatus.InReview) return "info";
  return "done";
}

export function getTaskStatusLabel(status: TaskStatus): string {
  return status === TaskStatus.InReview ? "In Review" : status;
}

export function getTaskStatusHint(task: TaskStatusHintInput): string {
  if (task.status === TaskStatus.Pending) {
    if (task.assignTo.length === 0) return "No assignees yet";
    const done = task.assignTo.filter((a) => a.status === TaskAssignmentStatus.Done).length;
    return `${done}/${task.assignTo.length} assignees done`;
  }
  if (task.status === TaskStatus.InReview) {
    const approved = task.reviewers.filter((r) => r.decision === ReviewDecision.Approved).length;
    return `${approved}/${task.reviewers.length} approvals`;
  }
  return "All approvals complete";
}

export interface ReviewerDisplayRow {
  id: string;
  name: string;
  status: string;
}

export function mapReviewersForDisplay(
  task: Pick<TaskDetailRow, "created_by_user_id" | "reviewers">,
): ReviewerDisplayRow[] {
  return task.reviewers.map((r) => ({
    id: r.id,
    name: r.reviewer_user_id === task.created_by_user_id ? `${r.name} (creator)` : r.name,
    status: r.decision,
  }));
}
