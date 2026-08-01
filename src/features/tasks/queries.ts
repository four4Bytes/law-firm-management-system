import { cache } from "react";

import type { Task, User } from "@/generated/prisma/browser";
import { prisma } from "@/lib/prisma";
import type { AccessContext } from "@/lib/rbac";

export type ActiveUserSummary = Pick<User, "id" | "name">;

export type TaskRow = Pick<Task, "id" | "title" | "status" | "updated_at"> & {
  assignTo: string;
  created_by_user_id: string;
};

export type TaskDetailRow = TaskRow &
  Pick<Task, "description" | "created_at"> & {
    assignee_ids: string[];
  };

export interface TaskAccessPayload {
  userId: string;
  taskId: string;
}

export const getActiveUsers = cache(async (): Promise<ActiveUserSummary[]> => {
  return prisma.user.findMany({
    where: { is_active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
});

export const getTaskById = cache(async (id: string) => {
  return prisma.task.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      case_id: true,
      created_by_user_id: true,
      created_at: true,
      updated_at: true,
      taskAssignments: {
        select: { user: { select: { name: true } }, user_id: true },
      },
    },
  });
});

export const getTaskDetailRowById = cache(async (id: string): Promise<TaskDetailRow | null> => {
  const task = await prisma.task.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      created_by_user_id: true,
      updated_at: true,
      created_at: true,
      taskAssignments: {
        select: { user_id: true, user: { select: { name: true } } },
      },
    },
  });

  if (!task) return null;

  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    created_by_user_id: task.created_by_user_id,
    assignTo: task.taskAssignments.map((a) => a.user.name).join(", "),
    assignee_ids: task.taskAssignments.map((a) => a.user_id),
    updated_at: task.updated_at,
    created_at: task.created_at,
  };
});

// ----- Access context -----

export const getTaskAccessContext = cache(
  async ({ userId, taskId }: TaskAccessPayload): Promise<AccessContext> => {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        created_by_user_id: true,
        case: {
          select: {
            caseAssignments: {
              where: { user_id: userId },
              select: { id: true },
            },
          },
        },
        taskAssignments: {
          where: { user_id: userId },
          select: { id: true },
        },
      },
    });

    if (!task) {
      return { assigned: false, own: false, taskOnly: false };
    }

    return {
      assigned: task.case.caseAssignments.length > 0,
      own: task.created_by_user_id === userId,
      taskOnly: task.taskAssignments.length > 0,
    };
  },
);
