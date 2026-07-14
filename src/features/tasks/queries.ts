import { cache } from "react";

import type { User } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type ActiveUserSummary = Pick<User, "id" | "name">;

export type TaskRow = {
  id: string;
  title: string;
  status: string;
  assignTo: string;
  updated_at: Date;
};

export type TaskDetailRow = TaskRow & {
  description: string | null;
  created_at: Date;
  assignee_ids: string[];
};

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
    assignTo: task.taskAssignments.map((a) => a.user.name).join(", "),
    assignee_ids: task.taskAssignments.map((a) => a.user_id),
    updated_at: task.updated_at,
    created_at: task.created_at,
  };
});
