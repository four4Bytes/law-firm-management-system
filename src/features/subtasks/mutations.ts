import { SubtaskStatus } from "@/generated/prisma/browser";
import { prisma } from "@/lib/infra/prisma";

export interface SubtaskCreatePayload {
  taskId: string;
  title: string;
  description?: string | null;
  due_date: Date;
  assignee_ids: string[];
  createdBy: string;
}

export async function createSubtask(payload: SubtaskCreatePayload): Promise<{ id: string }> {
  const { taskId, title, description, due_date, assignee_ids, createdBy } = payload;
  return prisma.subtask.create({
    data: {
      task_id: taskId,
      title,
      description,
      due_date,
      created_by_user_id: createdBy,
      assignments: { create: assignee_ids.map((user_id) => ({ user_id })) },
    },
    select: { id: true },
  });
}

export interface SubtaskUpdatePayload {
  subtaskId: string;
  title: string;
  description?: string | null;
  due_date: Date;
  assignee_ids?: string[];
}

export async function updateSubtask(payload: SubtaskUpdatePayload): Promise<void> {
  const { subtaskId, title, description, due_date, assignee_ids } = payload;
  await prisma.$transaction(async (tx) => {
    await tx.subtask.update({ where: { id: subtaskId }, data: { title, description, due_date } });
    if (assignee_ids) {
      await tx.subtaskAssignment.deleteMany({ where: { subtask_id: subtaskId } });
      await tx.subtaskAssignment.createMany({
        data: assignee_ids.map((user_id) => ({ subtask_id: subtaskId, user_id })),
      });
    }
  });
}

export async function completeSubtask(payload: {
  subtaskId: string;
  userId: string;
}): Promise<void> {
  const { subtaskId, userId } = payload;
  await prisma.subtask.update({
    where: { id: subtaskId },
    data: { status: SubtaskStatus.Done, completed_at: new Date(), completed_by_user_id: userId },
  });
}

export async function deleteSubtask(payload: { subtaskId: string }): Promise<void> {
  const { subtaskId } = payload;
  await prisma.subtask.delete({ where: { id: subtaskId } });
}
