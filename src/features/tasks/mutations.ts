import { TaskAssignmentStatus, TaskStatus, type ReviewDecision } from "@/generated/prisma/browser";
import { prisma, type TransactionClient } from "@/lib/prisma";

export interface TaskCreateData {
  title: string;
  description?: string | null;
  case_id: string;
  created_by_user_id: string;
  assignee_ids?: string[];
}

export interface TaskUpdateData {
  title?: string;
  description?: string | null;
  assignee_ids?: string[];
}

export interface ReviewDecisionData {
  taskId: string;
  reviewerUserId: string;
  decision: ReviewDecision;
}

/**
 * Derives the task status from its assignees' submission states and reviewers' decisions.
 *
 * - Any `Rejected` → `Pending` (rework).
 * - All reviewers `Accepted` and (no assignees or all assignees `Submitted`) → `Completed`.
 * - All assignees `Submitted` → `Submitted`.
 * - Otherwise → `Pending`.
 *
 * @param assignmentStatuses - The current submission state of every assignee.
 * @param reviewerDecisions  - The current decision of every reviewer.
 * @returns The derived task status.
 */
export function deriveTaskStatus(
  assignmentStatuses: TaskAssignmentStatus[],
  reviewerDecisions: ReviewDecision[],
): TaskStatus {
  if (reviewerDecisions.some((d) => d === "Rejected")) return TaskStatus.Pending;
  if (
    reviewerDecisions.length > 0 &&
    reviewerDecisions.every((d) => d === "Accepted") &&
    (assignmentStatuses.length === 0 || assignmentStatuses.every((s) => s === "Submitted"))
  ) {
    return TaskStatus.Completed;
  }
  if (assignmentStatuses.length > 0 && assignmentStatuses.every((s) => s === "Submitted")) {
    return TaskStatus.Submitted;
  }
  return TaskStatus.Pending;
}

/**
 * Grant read-only case membership to users attached to a task. Case assignment
 * is the prerequisite (`ASSIGNED`) for task-level access, so auto-grant
 * satisfies the spec's task attachment rule.
 *
 * @param tx       - The transaction client.
 * @param caseId   - The parent case of the task.
 * @param userIds  - The users to ensure are case members.
 */
async function grantCaseMembership(
  tx: TransactionClient,
  caseId: string,
  userIds: string[],
): Promise<void> {
  if (userIds.length === 0) return;

  const existing = await tx.caseAssignment.findMany({
    where: { case_id: caseId, user_id: { in: userIds } },
    select: { user_id: true },
  });
  const existingIds = new Set(existing.map((a) => a.user_id));
  const missing = userIds.filter((id) => !existingIds.has(id));

  if (missing.length > 0) {
    await tx.caseAssignment.createMany({
      data: missing.map((user_id) => ({ case_id: caseId, user_id })),
    });
  }
}

export async function createTask(data: TaskCreateData): Promise<{ id: string }> {
  const { assignee_ids, created_by_user_id, case_id, ...taskData } = data;
  const attached = [...new Set([...(assignee_ids ?? []), created_by_user_id])];

  return prisma.$transaction(async (tx) => {
    const task = await tx.task.create({
      data: {
        ...taskData,
        status: TaskStatus.Pending,
        case_id,
        created_by_user_id,
        ...(assignee_ids?.length
          ? { taskAssignments: { create: assignee_ids.map((user_id) => ({ user_id })) } }
          : {}),
        taskReviewers: { create: { reviewer_user_id: created_by_user_id } },
      },
      select: { id: true },
    });

    await grantCaseMembership(tx, case_id, attached);

    return task;
  });
}

export async function updateTask(id: string, data: TaskUpdateData): Promise<{ id: string }> {
  const { assignee_ids, ...taskData } = data;

  return prisma.$transaction(async (tx) => {
    const task = await tx.task.update({
      where: { id },
      data: {
        ...taskData,
        ...(assignee_ids !== undefined
          ? {
              taskAssignments: {
                deleteMany: {},
                create: assignee_ids.map((user_id) => ({ user_id })),
              },
            }
          : {}),
      },
      select: { id: true, case_id: true },
    });

    if (assignee_ids !== undefined) {
      if (assignee_ids.length) {
        await grantCaseMembership(tx, task.case_id, assignee_ids);
      }

      // Recreating assignments resets submissions to Pending, reopening the task.
      const [assignments, reviewers] = await Promise.all([
        tx.taskAssignment.findMany({ where: { task_id: id }, select: { status: true } }),
        tx.taskReviewer.findMany({ where: { task_id: id }, select: { decision: true } }),
      ]);
      const status = deriveTaskStatus(
        assignments.map((a) => a.status),
        reviewers.map((r) => r.decision),
      );
      await tx.task.update({ where: { id }, data: { status }, select: { id: true } });
    }

    return { id: task.id };
  });
}

export async function deleteTask(id: string): Promise<{ id: string }> {
  return prisma.task.delete({ where: { id }, select: { id: true } });
}

/**
 * Sets a single assignee's submission state and re-derives the task status.
 * Reversible (`Pending` ⇄ `Submitted`) while the task is `Pending` or `Submitted`;
 * locked in `Completed` / `Cancelled`.
 *
 * @param taskId - The task whose assignment is being updated.
 * @param userId - The assignee performing the submit/revert.
 * @param status - The new submission state.
 * @returns The re-derived task status.
 */
export async function setAssignmentStatus(
  taskId: string,
  userId: string,
  status: TaskAssignmentStatus,
): Promise<{ taskStatus: TaskStatus }> {
  return prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({
      where: { id: taskId },
      select: { status: true },
    });
    if (!task) throw new Error("Task not found");
    if (task.status === TaskStatus.Completed || task.status === TaskStatus.Cancelled) {
      throw new Error("Assignment submission is locked for this task");
    }

    await tx.taskAssignment.updateMany({
      where: { task_id: taskId, user_id: userId },
      data: { status },
    });

    const [assignments, reviewers] = await Promise.all([
      tx.taskAssignment.findMany({ where: { task_id: taskId }, select: { status: true } }),
      tx.taskReviewer.findMany({ where: { task_id: taskId }, select: { decision: true } }),
    ]);

    const taskStatus = deriveTaskStatus(
      assignments.map((a) => a.status),
      reviewers.map((r) => r.decision),
    );

    await tx.task.update({
      where: { id: taskId },
      data: { status: taskStatus },
      select: { id: true },
    });

    return { taskStatus };
  });
}

export async function addTaskReviewer(
  taskId: string,
  reviewerUserId: string,
): Promise<{ id: string }> {
  return prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({
      where: { id: taskId },
      select: { case_id: true, status: true },
    });
    if (!task) throw new Error("Task not found");
    if (task.status === TaskStatus.Cancelled) {
      throw new Error("Cannot add a reviewer to a cancelled task");
    }

    await tx.taskReviewer.upsert({
      where: {
        task_id_reviewer_user_id: { task_id: taskId, reviewer_user_id: reviewerUserId },
      },
      create: { task_id: taskId, reviewer_user_id: reviewerUserId },
      update: { decision: "Pending", reviewed_at: null },
    });

    if (task.status === TaskStatus.Completed) {
      // Adding a reviewer reopens the task for rework: reset existing reviewer
      // decisions and assignee submissions to Pending.
      await tx.taskReviewer.updateMany({
        where: { task_id: taskId },
        data: { decision: "Pending", reviewed_at: null },
      });
      await tx.taskAssignment.updateMany({
        where: { task_id: taskId },
        data: { status: "Pending" },
      });
    }

    const [assignments, reviewers] = await Promise.all([
      tx.taskAssignment.findMany({ where: { task_id: taskId }, select: { status: true } }),
      tx.taskReviewer.findMany({ where: { task_id: taskId }, select: { decision: true } }),
    ]);
    const status = deriveTaskStatus(
      assignments.map((a) => a.status),
      reviewers.map((r) => r.decision),
    );
    await tx.task.update({
      where: { id: taskId },
      data: { status },
      select: { id: true },
    });

    await grantCaseMembership(tx, task.case_id, [reviewerUserId]);

    return { id: taskId };
  });
}

export async function removeTaskReviewer(
  taskId: string,
  reviewerUserId: string,
  createdByUserId: string,
): Promise<{ id: string }> {
  if (reviewerUserId === createdByUserId) {
    throw new Error("Cannot remove the task creator as a reviewer");
  }

  return prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({
      where: { id: taskId },
      select: { case_id: true, status: true, created_by_user_id: true },
    });
    if (!task) throw new Error("Task not found");

    await tx.taskReviewer.deleteMany({
      where: { task_id: taskId, reviewer_user_id: reviewerUserId },
    });

    if (task.status === TaskStatus.Submitted) {
      const [assignments, reviewers] = await Promise.all([
        tx.taskAssignment.findMany({ where: { task_id: taskId }, select: { status: true } }),
        tx.taskReviewer.findMany({ where: { task_id: taskId }, select: { decision: true } }),
      ]);
      const status = deriveTaskStatus(
        assignments.map((a) => a.status),
        reviewers.map((r) => r.decision),
      );

      await tx.task.update({
        where: { id: taskId },
        data: { status },
        select: { id: true },
      });
    }

    return { id: taskId };
  });
}

/**
 * Records a reviewer's decision and derives the resulting task status
 * atomically. A rejection reopens the task (`Pending`) and resets every
 * reviewer's decision; all-accept completes the task.
 *
 * @param data - The task, reviewer, and decision being applied.
 * @returns The derived task status after the write.
 */
export async function applyReviewDecision(data: ReviewDecisionData): Promise<{
  taskStatus: TaskStatus;
}> {
  const { taskId, reviewerUserId, decision } = data;

  return prisma.$transaction(async (tx) => {
    await tx.taskReviewer.updateMany({
      where: { task_id: taskId, reviewer_user_id: reviewerUserId },
      data: { decision, reviewed_at: new Date() },
    });

    const [assignments, reviewers] = await Promise.all([
      tx.taskAssignment.findMany({ where: { task_id: taskId }, select: { status: true } }),
      tx.taskReviewer.findMany({ where: { task_id: taskId }, select: { decision: true } }),
    ]);

    const isRejection = reviewers.some((r) => r.decision === "Rejected");
    const taskStatus = deriveTaskStatus(
      assignments.map((a) => a.status),
      reviewers.map((r) => r.decision),
    );

    // A rejection reopens the task for rework: reset every reviewer decision and
    // every assignee submission to Pending.
    if (isRejection) {
      await tx.taskReviewer.updateMany({
        where: { task_id: taskId },
        data: { decision: "Pending", reviewed_at: null },
      });
      await tx.taskAssignment.updateMany({
        where: { task_id: taskId },
        data: { status: "Pending" },
      });
    }

    await tx.task.update({
      where: { id: taskId },
      data: { status: taskStatus },
      select: { id: true },
    });

    return { taskStatus };
  });
}

export async function cancelTask(taskId: string): Promise<{ id: string }> {
  return prisma.task.update({
    where: { id: taskId },
    data: { status: TaskStatus.Cancelled },
    select: { id: true },
  });
}
