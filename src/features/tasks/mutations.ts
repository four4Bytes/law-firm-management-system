import { getDocumentFilePathsByTaskId } from "@/features/documents/queries";
import { TaskAssignmentStatus, TaskStatus, type ReviewDecision } from "@/generated/prisma/browser";
import { prisma, type TransactionClient } from "@/lib/prisma";
import { deleteDocumentFiles } from "@/lib/storage-cleanup";

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

async function lockTask(tx: TransactionClient, taskId: string): Promise<void> {
  await tx.$queryRaw`SELECT 1 FROM "Task" WHERE id = ${taskId} FOR UPDATE`;
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
      await lockTask(tx, id);

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
  const filePaths = await getDocumentFilePathsByTaskId(id);
  await deleteDocumentFiles(filePaths);
  return prisma.task.delete({ where: { id }, select: { id: true } });
}

export async function setAssignmentStatus(
  taskId: string,
  userId: string,
  status: TaskAssignmentStatus,
): Promise<{ taskStatus: TaskStatus }> {
  return prisma.$transaction(async (tx) => {
    await lockTask(tx, taskId);

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
    await lockTask(tx, taskId);

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
): Promise<{ id: string }> {
  return prisma.$transaction(async (tx) => {
    await lockTask(tx, taskId);

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

export async function applyReviewDecision(data: ReviewDecisionData): Promise<{
  taskStatus: TaskStatus;
}> {
  const { taskId, reviewerUserId, decision } = data;

  return prisma.$transaction(async (tx) => {
    await lockTask(tx, taskId);

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
