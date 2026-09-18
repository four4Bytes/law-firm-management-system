import { getDocumentFilePathsByTaskId } from "@/features/documents/queries";
import { TaskAssignmentStatus, TaskStatus, type ReviewDecision } from "@/generated/prisma/browser";
import { TaskLockedError, TaskValidationError } from "@/lib/errors";
import { prisma, type TransactionClient } from "@/lib/prisma";
import { lockTaskRow } from "@/lib/row-locks";
import { deleteDocumentFiles } from "@/lib/storage-cleanup";

import { hasAssigneeReviewerOverlap, wouldLeaveNoReviewer } from "./validation";

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
  reviewer_ids?: string[];
  removed_reviewer_ids?: string[];
}

export interface ReviewDecisionData {
  taskId: string;
  reviewerUserId: string;
  decision: ReviewDecision;
}

export function deriveTaskStatus(
  assignmentStatuses: TaskAssignmentStatus[],
  reviewerDecisions: ReviewDecision[],
): TaskStatus {
  if (reviewerDecisions.some((d) => d === "Rejected")) return TaskStatus.Pending;
  if (
    reviewerDecisions.length > 0 &&
    reviewerDecisions.every((d) => d === "Approved") &&
    (assignmentStatuses.length === 0 || assignmentStatuses.every((s) => s === "Done"))
  ) {
    return TaskStatus.Done;
  }
  if (assignmentStatuses.length > 0 && assignmentStatuses.every((s) => s === "Done")) {
    return TaskStatus.InReview;
  }
  return TaskStatus.Pending;
}

async function grantCaseMembership(
  tx: TransactionClient,
  caseId: string,
  userIds: string[],
): Promise<void> {
  if (userIds.length === 0) return;

  await tx.caseAssignment.createMany({
    data: userIds.map((user_id) => ({ case_id: caseId, user_id })),
    skipDuplicates: true,
  });
}

export async function createTask(data: TaskCreateData): Promise<{ id: string }> {
  const { assignee_ids, created_by_user_id, case_id, ...taskData } = data;
  const attached = [...new Set([...(assignee_ids ?? []), created_by_user_id])];

  if (assignee_ids?.includes(created_by_user_id)) {
    throw new TaskValidationError(
      "Assignee and reviewer must be distinct",
      "A user cannot be both assignee and reviewer on the same task. Remove the overlapping user from one role.",
    );
  }

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
  const { assignee_ids, reviewer_ids, removed_reviewer_ids, ...taskData } = data;

  return prisma.$transaction(async (tx) => {
    await lockTaskRow(tx, id);

    const currentTask = await tx.task.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!currentTask) throw new Error("Task not found");
    if (currentTask.status === TaskStatus.Done) throw new TaskLockedError();

    let removed: string[] = [];
    let added: string[] = [];

    if (assignee_ids !== undefined) {
      const [current, reviewers] = await Promise.all([
        tx.taskAssignment.findMany({ where: { task_id: id }, select: { user_id: true } }),
        tx.taskReviewer.findMany({ where: { task_id: id }, select: { reviewer_user_id: true } }),
      ]);
      if (
        hasAssigneeReviewerOverlap(
          assignee_ids,
          reviewers.map((r) => r.reviewer_user_id),
        )
      ) {
        throw new TaskValidationError(
          "Assignee and reviewer must be distinct",
          "A user cannot be both assignee and reviewer on the same task. Remove the overlapping user from one role.",
        );
      }
      const currentIds = current.map((a) => a.user_id);

      const currentSet = new Set(currentIds);
      const newSet = new Set(assignee_ids);

      removed = currentIds.filter((u) => !newSet.has(u));
      added = assignee_ids.filter((u) => !currentSet.has(u));
    }

    const task = await tx.task.update({
      where: { id },
      data: {
        ...taskData,
        ...(assignee_ids !== undefined && (removed.length || added.length)
          ? {
              taskAssignments: {
                ...(removed.length ? { deleteMany: { user_id: { in: removed } } } : {}),
                ...(added.length ? { create: added.map((user_id) => ({ user_id })) } : {}),
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
    }

    if (reviewer_ids !== undefined) {
      const existingReviewers = await tx.taskReviewer.findMany({
        where: { task_id: id },
        select: { reviewer_user_id: true },
      });
      const existingReviewerIds = new Set(existingReviewers.map((r) => r.reviewer_user_id));
      const newReviewerIds = reviewer_ids.filter((id) => !existingReviewerIds.has(id));
      if (newReviewerIds.length > 0) {
        const finalAssigneeIds =
          assignee_ids ??
          (
            await tx.taskAssignment.findMany({
              where: { task_id: id },
              select: { user_id: true },
            })
          ).map((a) => a.user_id);
        if (hasAssigneeReviewerOverlap(newReviewerIds, finalAssigneeIds)) {
          throw new TaskValidationError(
            "Assignee and reviewer must be distinct",
            "A user cannot be both assignee and reviewer on the same task. Remove the overlapping user from one role.",
          );
        }
        await tx.taskReviewer.createMany({
          data: newReviewerIds.map((reviewer_user_id) => ({
            task_id: id,
            reviewer_user_id,
            decision: "Pending" as const,
            reviewed_at: null,
          })),
          skipDuplicates: true,
        });
        await grantCaseMembership(tx, task.case_id, newReviewerIds);
      }
    }

    if (removed_reviewer_ids !== undefined && removed_reviewer_ids.length > 0) {
      await tx.taskReviewer.deleteMany({
        where: { task_id: id, reviewer_user_id: { in: removed_reviewer_ids } },
      });
      const remainingReviewers = await tx.taskReviewer.count({ where: { task_id: id } });
      if (wouldLeaveNoReviewer(remainingReviewers)) {
        throw new TaskValidationError(
          "At least one reviewer required",
          "A task must have at least one reviewer. Add a reviewer before removing this one.",
        );
      }
    }

    if (
      assignee_ids !== undefined ||
      reviewer_ids !== undefined ||
      removed_reviewer_ids !== undefined
    ) {
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
  const { filePaths, deleted } = await prisma.$transaction(async (tx) => {
    await lockTaskRow(tx, id);

    const filePaths = await getDocumentFilePathsByTaskId(id, tx);

    const deleted = await tx.task.delete({ where: { id }, select: { id: true } });

    return { filePaths, deleted };
  });

  await deleteDocumentFiles(filePaths);

  return deleted;
}

export async function setAssignmentStatus(
  taskId: string,
  userId: string,
  status: TaskAssignmentStatus,
): Promise<{ taskStatus: TaskStatus }> {
  return prisma.$transaction(async (tx) => {
    await lockTaskRow(tx, taskId);

    const task = await tx.task.findUnique({
      where: { id: taskId },
      select: { status: true },
    });
    if (!task) throw new Error("Task not found");
    if (task.status === TaskStatus.Done) {
      throw new TaskLockedError();
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
    await lockTaskRow(tx, taskId);

    const task = await tx.task.findUnique({
      where: { id: taskId },
      select: { case_id: true, status: true },
    });
    if (!task) throw new Error("Task not found");

    const assigneeMatch = await tx.taskAssignment.findFirst({
      where: { task_id: taskId, user_id: reviewerUserId },
      select: { user_id: true },
    });
    if (assigneeMatch !== null) {
      throw new TaskValidationError(
        "Assignee and reviewer must be distinct",
        "A user cannot be both assignee and reviewer on the same task. Remove the user from assignees first.",
      );
    }

    await tx.taskReviewer.upsert({
      where: {
        task_id_reviewer_user_id: { task_id: taskId, reviewer_user_id: reviewerUserId },
      },
      create: { task_id: taskId, reviewer_user_id: reviewerUserId },
      update: { decision: "Pending", reviewed_at: null },
    });

    if (task.status === TaskStatus.Done) {
      await tx.taskReviewer.updateMany({
        where: { task_id: taskId },
        data: { decision: "Pending", reviewed_at: null },
      });
      await tx.taskAssignment.updateMany({
        where: { task_id: taskId },
        data: { status: "Todo" },
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
): Promise<{ id: string }> {
  return prisma.$transaction(async (tx) => {
    await lockTaskRow(tx, taskId);

    const task = await tx.task.findUnique({
      where: { id: taskId },
      select: { case_id: true, status: true, created_by_user_id: true },
    });
    if (!task) throw new Error("Task not found");

    if (reviewerUserId === task.created_by_user_id) {
      throw new Error("Cannot remove the task creator as a reviewer");
    }

    await tx.taskReviewer.deleteMany({
      where: { task_id: taskId, reviewer_user_id: reviewerUserId },
    });

    const remainingReviewers = await tx.taskReviewer.count({ where: { task_id: taskId } });
    if (wouldLeaveNoReviewer(remainingReviewers)) {
      throw new TaskValidationError(
        "At least one reviewer required",
        "A task must have at least one reviewer. Add a reviewer before removing this one.",
      );
    }

    if (task.status === TaskStatus.InReview) {
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

export async function applyReviewDecision(data: ReviewDecisionData): Promise<{
  taskStatus: TaskStatus;
}> {
  const { taskId, reviewerUserId, decision } = data;

  return prisma.$transaction(async (tx) => {
    await lockTaskRow(tx, taskId);

    const task = await tx.task.findUnique({
      where: { id: taskId },
      select: { status: true },
    });
    if (!task) throw new Error("Task not found");
    if (task.status !== TaskStatus.InReview) {
      throw new Error("Only tasks in review can be reviewed");
    }

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

    if (isRejection) {
      await tx.taskReviewer.updateMany({
        where: { task_id: taskId },
        data: { decision: "Pending", reviewed_at: null },
      });
      await tx.taskAssignment.updateMany({
        where: { task_id: taskId },
        data: { status: "Todo" },
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
