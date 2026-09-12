import { cache } from "react";

import type { Subtask } from "@/generated/prisma/browser";
import { prisma } from "@/lib/prisma";

export type SubtaskAssignee = {
  id: string;
  name: string;
};

export type SubtaskRow = Pick<
  Subtask,
  | "id"
  | "task_id"
  | "title"
  | "description"
  | "status"
  | "priority"
  | "due_date"
  | "created_at"
  | "updated_at"
  | "created_by_user_id"
> & {
  assignees: SubtaskAssignee[];
  assignee_ids: string[];
};

export interface SubtaskProgress {
  total: number;
  completed: number;
  percent: number;
}

function toSubtaskRow(
  subtask: Pick<
    Subtask,
    | "id"
    | "task_id"
    | "title"
    | "description"
    | "status"
    | "priority"
    | "due_date"
    | "created_at"
    | "updated_at"
    | "created_by_user_id"
  > & { assignments: { user_id: string; user: { name: string } }[] },
): SubtaskRow {
  return {
    id: subtask.id,
    task_id: subtask.task_id,
    title: subtask.title,
    description: subtask.description,
    status: subtask.status,
    priority: subtask.priority,
    due_date: subtask.due_date,
    created_at: subtask.created_at,
    updated_at: subtask.updated_at,
    created_by_user_id: subtask.created_by_user_id,
    assignees: subtask.assignments.map((a) => ({ id: a.user_id, name: a.user.name })),
    assignee_ids: subtask.assignments.map((a) => a.user_id),
  };
}

export function toSubtaskProgress(statuses: string[]): SubtaskProgress {
  const total = statuses.length;
  const completed = statuses.filter((s) => s === "Completed").length;
  return { total, completed, percent: total === 0 ? 0 : Math.round((completed / total) * 100) };
}

export const getSubtasksByTaskId = cache(async (taskId: string): Promise<SubtaskRow[]> => {
  const subtasks = await prisma.subtask.findMany({
    where: { task_id: taskId },
    select: {
      id: true,
      task_id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      due_date: true,
      created_at: true,
      updated_at: true,
      created_by_user_id: true,
      assignments: { select: { user_id: true, user: { select: { name: true } } } },
    },
    orderBy: { created_at: "asc" },
  });

  return subtasks.map(toSubtaskRow);
});

export const getSubtaskById = cache(async (id: string) => {
  return prisma.subtask.findUnique({
    where: { id },
    select: {
      id: true,
      task_id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      due_date: true,
      reminder_days: true,
      created_by_user_id: true,
      created_at: true,
      updated_at: true,
      task: { select: { case_id: true, status: true } },
      assignments: { select: { user_id: true, user: { select: { name: true } } } },
    },
  });
});

export const getSubtaskRowById = cache(async (id: string): Promise<SubtaskRow | null> => {
  const subtask = await prisma.subtask.findUnique({
    where: { id },
    select: {
      id: true,
      task_id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      due_date: true,
      created_at: true,
      updated_at: true,
      created_by_user_id: true,
      assignments: { select: { user_id: true, user: { select: { name: true } } } },
    },
  });

  if (!subtask) return null;
  return toSubtaskRow(subtask);
});

export const getSubtaskProgress = cache(async (taskId: string): Promise<SubtaskProgress> => {
  const subtasks = await prisma.subtask.findMany({
    where: { task_id: taskId },
    select: { status: true },
  });

  return toSubtaskProgress(subtasks.map((s) => s.status));
});
