import type { StatusBadgeVariant } from "@/components/ui/StatusBadge/StatusBadge";
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

export interface DirectoryUser {
  id: string;
  name: string;
  is_online?: boolean;
}

export interface TaskMemberDisplayRow {
  id: string;
  name: string;
  status: string;
  is_online?: boolean;
}

export interface AssigneeSnapshot {
  id: string;
  name: string;
  status: TaskAssignmentStatus;
}

export interface ReviewerSnapshot {
  reviewer_user_id: string;
  name: string;
  decision: ReviewDecision;
}

export interface AssigneeDisplayPayload {
  users: DirectoryUser[];
  selectedIds: Set<string>;
  snapshot: AssigneeSnapshot[];
}

export interface ReviewerDisplayPayload {
  users: DirectoryUser[];
  selectedIds: Set<string>;
  snapshot: ReviewerSnapshot[];
  createdByUserId?: string;
}

export function withLockedReviewer(ids: Set<string>, creatorUserId: string): Set<string> {
  if (ids.has(creatorUserId)) return ids;
  return new Set([...ids, creatorUserId]);
}

export function resolveAssigneeDisplayRows(
  payload: AssigneeDisplayPayload,
): TaskMemberDisplayRow[] {
  const { users, selectedIds, snapshot } = payload;
  const snapshotById = new Map(snapshot.map((entry) => [entry.id, entry]));
  const directoryIds = new Set(users.map((user) => user.id));
  const rows = users
    .filter((user) => selectedIds.has(user.id))
    .map((user) => {
      const saved = snapshotById.get(user.id);
      return {
        id: user.id,
        name: user.name,
        status: saved?.status ?? TaskAssignmentStatus.Todo,
        is_online: user.is_online,
      };
    });
  for (const id of selectedIds) {
    if (!directoryIds.has(id)) {
      const saved = snapshotById.get(id);
      if (saved)
        rows.push({ id: saved.id, name: saved.name, status: saved.status, is_online: undefined });
    }
  }
  return rows;
}

export function resolveReviewerDisplayRows(
  payload: ReviewerDisplayPayload,
): TaskMemberDisplayRow[] {
  const { users, selectedIds, snapshot, createdByUserId } = payload;
  const snapshotByUserId = new Map(snapshot.map((entry) => [entry.reviewer_user_id, entry]));
  const directoryIds = new Set(users.map((user) => user.id));
  const toRow = (user: DirectoryUser): TaskMemberDisplayRow => {
    const saved = snapshotByUserId.get(user.id);
    return {
      id: user.id,
      name: user.id === createdByUserId ? `${user.name} (creator)` : user.name,
      status: saved?.decision ?? ReviewDecision.Pending,
      is_online: user.is_online,
    };
  };
  const rows = users.filter((user) => selectedIds.has(user.id)).map(toRow);
  for (const id of selectedIds) {
    if (!directoryIds.has(id)) {
      const saved = snapshotByUserId.get(id);
      if (saved) {
        rows.push({
          id: saved.reviewer_user_id,
          name: id === createdByUserId ? `${saved.name} (creator)` : saved.name,
          status: saved.decision,
          is_online: undefined,
        });
      }
    }
  }
  return rows;
}
