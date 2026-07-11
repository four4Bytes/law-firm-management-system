import { type TaskStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export interface TaskCreateData {
  title: string;
  description?: string | null;
  status: TaskStatus;
  case_id: string;
  created_by_user_id: string;
  assignee_ids?: string[];
}

export async function createTask(data: TaskCreateData): Promise<{ id: string }> {
  const { assignee_ids, ...taskData } = data;

  return prisma.task.create({
    data: {
      ...taskData,
      ...(assignee_ids?.length
        ? { taskAssignments: { create: assignee_ids.map((user_id) => ({ user_id })) } }
        : {}),
    },
    select: { id: true },
  });
}

export async function updateTask(
  id: string,
  data: {
    title?: string;
    description?: string | null;
    status?: TaskStatus;
    assignee_ids?: string[];
  },
): Promise<{ id: string }> {
  const { assignee_ids, ...taskData } = data;

  return prisma.task.update({
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
    select: { id: true },
  });
}

export async function deleteTask(id: string): Promise<{ id: string }> {
  return prisma.task.delete({ where: { id }, select: { id: true } });
}
