import { SubtaskStatus } from "@/generated/prisma/browser";
import { TaskLockedError } from "@/lib/errors";
import { prisma, type TransactionClient } from "@/lib/prisma";

export interface SubtaskCreateData {
  title: string;
  description?: string | null;
  priority?: string | null;
  due_date?: Date | null;
  status?: SubtaskStatus;
  reminder_days?: number | null;
  task_id: string;
  created_by_user_id: string;
  assignee_ids?: string[];
}

export interface SubtaskUpdateData {
  title?: string;
  description?: string | null;
  priority?: string | null;
  due_date?: Date | null;
  status?: SubtaskStatus;
  reminder_days?: number | null;
  assignee_ids?: string[];
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

export async function lockSubtask(tx: TransactionClient, subtaskId: string): Promise<void> {
  await tx.$queryRaw`SELECT 1 FROM "Subtask" WHERE id = ${subtaskId} FOR UPDATE`;
}

async function assertParentTaskOpen(
  tx: TransactionClient,
  taskId: string,
): Promise<{ case_id: string }> {
  const parent = await tx.task.findUnique({
    where: { id: taskId },
    select: { case_id: true, status: true },
  });
  if (!parent) throw new Error("Parent task not found");
  if (parent.status === "Cancelled") throw new TaskLockedError();
  return { case_id: parent.case_id };
}

export async function createSubtask(data: SubtaskCreateData): Promise<{ id: string }> {
  const { assignee_ids, created_by_user_id, task_id, ...subtaskData } = data;
  const attached = [...new Set([...(assignee_ids ?? []), created_by_user_id])];

  return prisma.$transaction(async (tx) => {
    const { case_id } = await assertParentTaskOpen(tx, task_id);

    const subtask = await tx.subtask.create({
      data: {
        ...subtaskData,
        status: subtaskData.status ?? SubtaskStatus.Pending,
        task_id,
        created_by_user_id,
        ...(assignee_ids?.length
          ? { assignments: { create: assignee_ids.map((user_id) => ({ user_id })) } }
          : {}),
      },
      select: { id: true },
    });

    await grantCaseMembership(tx, case_id, attached);

    return subtask;
  });
}

export async function updateSubtask(
  id: string,
  data: SubtaskUpdateData,
): Promise<{ id: string; task_id: string }> {
  const { assignee_ids, ...subtaskData } = data;

  return prisma.$transaction(async (tx) => {
    await lockSubtask(tx, id);

    const current = await tx.subtask.findUnique({
      where: { id },
      select: { task_id: true },
    });
    if (!current) throw new Error("Subtask not found");

    const { case_id } = await assertParentTaskOpen(tx, current.task_id);

    let removed: string[] = [];
    let added: string[] = [];

    if (assignee_ids !== undefined) {
      const existing = (
        await tx.subtaskAssignment.findMany({
          where: { subtask_id: id },
          select: { user_id: true },
        })
      ).map((a) => a.user_id);
      const existingSet = new Set(existing);
      const nextSet = new Set(assignee_ids);

      removed = existing.filter((u) => !nextSet.has(u));
      added = assignee_ids.filter((u) => !existingSet.has(u));
    }

    const subtask = await tx.subtask.update({
      where: { id },
      data: {
        ...subtaskData,
        ...(assignee_ids !== undefined && (removed.length || added.length)
          ? {
              assignments: {
                ...(removed.length ? { deleteMany: { user_id: { in: removed } } } : {}),
                ...(added.length ? { create: added.map((user_id) => ({ user_id })) } : {}),
              },
            }
          : {}),
      },
      select: { id: true, task_id: true },
    });

    if (added.length) {
      await grantCaseMembership(tx, case_id, added);
    }

    return { id: subtask.id, task_id: subtask.task_id };
  });
}

export async function deleteSubtask(id: string): Promise<{ id: string; task_id: string }> {
  return prisma.$transaction(async (tx) => {
    await lockSubtask(tx, id);

    const current = await tx.subtask.findUnique({
      where: { id },
      select: { task_id: true },
    });
    if (!current) throw new Error("Subtask not found");

    await assertParentTaskOpen(tx, current.task_id);

    const deleted = await tx.subtask.delete({
      where: { id },
      select: { id: true, task_id: true },
    });

    return deleted;
  });
}

export async function setSubtaskStatus(
  subtaskId: string,
  status: SubtaskStatus,
): Promise<{ id: string; task_id: string }> {
  return prisma.$transaction(async (tx) => {
    await lockSubtask(tx, subtaskId);

    const current = await tx.subtask.findUnique({
      where: { id: subtaskId },
      select: { task_id: true, status: true },
    });
    if (!current) throw new Error("Subtask not found");

    await assertParentTaskOpen(tx, current.task_id);

    if (current.status === status) return { id: subtaskId, task_id: current.task_id };

    const updated = await tx.subtask.update({
      where: { id: subtaskId },
      data: { status },
      select: { id: true, task_id: true },
    });

    return updated;
  });
}
