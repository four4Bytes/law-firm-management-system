import { cache } from "react";

import type {
  ReviewDecision,
  Task,
  TaskAssignmentStatus,
  TaskStatus,
} from "@/generated/prisma/browser";
import { prisma } from "@/lib/infra/prisma";
import type { PageQuery } from "@/lib/primitives/types";
import type { AccessContext } from "@/lib/security/rbac";

export type TaskRow = Pick<Task, "id" | "title" | "status" | "updated_at"> & {
  assignTo: string;
  reviewers: string;
};

export interface TaskListFilters {
  status?: TaskStatus[];
}

export interface TaskListQuery extends Omit<PageQuery, "filters"> {
  caseId: string;
  filters?: TaskListFilters;
}

export type TaskReviewerRow = {
  id: string;
  reviewer_user_id: string;
  name: string;
  decision: ReviewDecision;
  reviewed_at: Date | null;
};

export type TaskDetailRow = Omit<TaskRow, "assignTo" | "reviewers"> &
  Pick<Task, "description" | "created_at" | "created_by_user_id"> & {
    assignTo: { id: string; name: string; status: TaskAssignmentStatus }[];
    assignee_ids: string[];
    reviewers: TaskReviewerRow[];
  };

// ----- Task list -----

export const getTasksPaginated = cache(
  async ({
    caseId,
    search = "",
    cursor,
    pageSize = 20,
    sort,
    filters,
  }: TaskListQuery): Promise<{
    rows: TaskRow[];
    nextCursor: string | null;
  }> => {
    const where = {
      case_id: caseId,
      ...(search ? { title: { contains: search, mode: "insensitive" as const } } : {}),
      ...(filters?.status && filters.status.length > 0 ? { status: { in: filters.status } } : {}),
    };

    const defaultOrderBy = { updated_at: "desc" } as const;

    const orderBy =
      sort?.column === "title"
        ? [{ title: sort.direction }, { id: "asc" as const }]
        : sort?.column === "status"
          ? [{ status: sort.direction }, { id: "asc" as const }]
          : sort?.column === "updated_at"
            ? [{ updated_at: sort.direction }, { id: "asc" as const }]
            : defaultOrderBy;

    const tasks = await prisma.task.findMany({
      take: pageSize + 1,
      skip: cursor ? 1 : 0,
      ...(cursor ? { cursor: { id: cursor } } : {}),
      where,
      orderBy,
      include: {
        taskAssignments: {
          include: { user: { select: { name: true } } },
        },
        taskReviewers: {
          include: { reviewer: { select: { name: true } } },
        },
      },
    });

    const hasMore = tasks.length > pageSize;
    if (hasMore) tasks.pop();

    const rows: TaskRow[] = tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      assignTo: t.taskAssignments.map((a) => a.user.name).join(", "),
      reviewers: t.taskReviewers.map((r) => r.reviewer.name).join(", "),
      updated_at: t.updated_at,
    }));

    return { rows, nextCursor: hasMore ? tasks[tasks.length - 1].id : null };
  },
);

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
        select: { user: { select: { name: true } }, user_id: true, status: true },
      },
      taskReviewers: {
        select: {
          id: true,
          reviewer_user_id: true,
          decision: true,
          reviewed_at: true,
        },
      },
    },
  });
});

export const getTaskReviewers = cache(async (taskId: string): Promise<TaskReviewerRow[]> => {
  const reviewers = await prisma.taskReviewer.findMany({
    where: { task_id: taskId },
    select: {
      id: true,
      reviewer_user_id: true,
      decision: true,
      reviewed_at: true,
      reviewer: { select: { name: true } },
    },
    orderBy: { created_at: "asc" },
  });

  return reviewers.map((r) => ({
    id: r.id,
    reviewer_user_id: r.reviewer_user_id,
    name: r.reviewer.name,
    decision: r.decision,
    reviewed_at: r.reviewed_at,
  }));
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
      created_by_user_id: true,
      taskAssignments: {
        select: { user_id: true, user: { select: { name: true } }, status: true },
      },
      taskReviewers: {
        select: {
          id: true,
          reviewer_user_id: true,
          decision: true,
          reviewed_at: true,
          reviewer: { select: { name: true } },
        },
        orderBy: { created_at: "asc" },
      },
    },
  });

  if (!task) return null;

  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    assignTo: task.taskAssignments.map((a) => ({
      id: a.user_id,
      name: a.user.name,
      status: a.status,
    })),
    assignee_ids: task.taskAssignments.map((a) => a.user_id),
    reviewers: task.taskReviewers.map((r) => ({
      id: r.id,
      reviewer_user_id: r.reviewer_user_id,
      name: r.reviewer.name,
      decision: r.decision,
      reviewed_at: r.reviewed_at,
    })),
    updated_at: task.updated_at,
    created_at: task.created_at,
    created_by_user_id: task.created_by_user_id,
  };
});

// ----- Access context -----

export const getTaskAccessContext = cache(
  async (userId: string, taskId: string): Promise<AccessContext> => {
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
        taskReviewers: {
          where: { reviewer_user_id: userId },
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
      taskOnly: task.taskAssignments.length > 0 || task.taskReviewers.length > 0,
    };
  },
);
