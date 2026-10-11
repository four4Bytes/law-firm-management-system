import { cache } from "react";

import type { Subtask } from "@/generated/prisma/browser";
import { prisma } from "@/lib/infra/prisma";

export type SubtaskRow = Pick<Subtask, "id" | "title" | "status" | "due_date" | "created_at"> & {
  assignTo: string;
};

export type SubtaskDetailRow = Pick<
  Subtask,
  | "id"
  | "task_id"
  | "title"
  | "description"
  | "status"
  | "due_date"
  | "created_by_user_id"
  | "created_at"
  | "updated_at"
> & {
  assignTo: { id: string; name: string }[];
  assignee_ids: string[];
  case_id: string;
};

export const getSubtasksByTaskId = cache(
  async (payload: { taskId: string }): Promise<SubtaskRow[]> => {
    const { taskId } = payload;
    const subtasks = await prisma.subtask.findMany({
      where: { task_id: taskId },
      orderBy: { due_date: "asc" },
      select: {
        id: true,
        title: true,
        status: true,
        due_date: true,
        created_at: true,
        assignments: { select: { user: { select: { name: true } } } },
      },
    });

    return subtasks.map((s) => ({
      id: s.id,
      title: s.title,
      status: s.status,
      due_date: s.due_date,
      created_at: s.created_at,
      assignTo: s.assignments.map((a) => a.user.name).join(", "),
    }));
  },
);

export const getSubtaskCountsByTaskIds = cache(
  async (payload: { taskIds: string[] }): Promise<Record<string, number>> => {
    const { taskIds } = payload;
    if (taskIds.length === 0) return {};
    const rows = await prisma.subtask.groupBy({
      by: ["task_id"],
      where: { task_id: { in: taskIds } },
      _count: { _all: true },
    });
    return Object.fromEntries(rows.map((r): [string, number] => [r.task_id, r._count._all]));
  },
);

export const getSubtaskDetailRowById = cache(
  async (subtaskId: string): Promise<SubtaskDetailRow | null> => {
    const subtask = await prisma.subtask.findUnique({
      where: { id: subtaskId },
      select: {
        id: true,
        task_id: true,
        title: true,
        description: true,
        status: true,
        due_date: true,
        created_by_user_id: true,
        created_at: true,
        updated_at: true,
        assignments: { select: { user_id: true, user: { select: { name: true } } } },
        task: { select: { case_id: true } },
      },
    });

    if (!subtask) return null;

    return {
      id: subtask.id,
      task_id: subtask.task_id,
      title: subtask.title,
      description: subtask.description,
      status: subtask.status,
      due_date: subtask.due_date,
      created_by_user_id: subtask.created_by_user_id,
      created_at: subtask.created_at,
      updated_at: subtask.updated_at,
      assignTo: subtask.assignments.map((a) => ({ id: a.user_id, name: a.user.name })),
      assignee_ids: subtask.assignments.map((a) => a.user_id),
      case_id: subtask.task.case_id,
    };
  },
);
