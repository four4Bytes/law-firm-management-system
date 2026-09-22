import { cache } from "react";

import type { CaseMilestone, CaseMilestoneStatus } from "@/generated/prisma/browser";
import { prisma } from "@/lib/infra/prisma";
import type { PageQuery } from "@/lib/primitives/types";
import type { AccessContext } from "@/lib/security/rbac";

export type MilestoneRow = Pick<
  CaseMilestone,
  "id" | "title" | "description" | "due_date" | "status"
>;

export type MilestoneListRow = Pick<
  CaseMilestone,
  "id" | "title" | "description" | "due_date" | "status"
>;

export interface MilestoneListFilters {
  status?: CaseMilestoneStatus[];
}

export interface MilestoneListQuery extends Omit<PageQuery, "filters"> {
  caseId: string;
  filters?: MilestoneListFilters;
}

export interface MilestoneAccessPayload {
  userId: string;
  milestoneId: string;
}

export const getMilestoneById = cache(async (id: string) => {
  return prisma.caseMilestone.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      due_date: true,
      status: true,
      case_id: true,
    },
  });
});

// ----- Milestone list -----

export const getMilestonesPaginated = cache(
  async ({
    caseId,
    search = "",
    cursor,
    pageSize = 20,
    sort,
    filters,
  }: MilestoneListQuery): Promise<{
    rows: MilestoneListRow[];
    nextCursor: string | null;
  }> => {
    const where = {
      case_id: caseId,
      ...(search ? { title: { contains: search, mode: "insensitive" as const } } : {}),
      ...(filters?.status && filters.status.length > 0 ? { status: { in: filters.status } } : {}),
    };

    const defaultOrderBy = { due_date: "desc" } as const;

    const orderBy =
      sort?.column === "title"
        ? [{ title: sort.direction }, { id: "asc" as const }]
        : sort?.column === "due_date"
          ? [{ due_date: sort.direction }, { id: "asc" as const }]
          : sort?.column === "status"
            ? [{ status: sort.direction }, { id: "asc" as const }]
            : defaultOrderBy;

    const milestones = await prisma.caseMilestone.findMany({
      take: pageSize + 1,
      skip: cursor ? 1 : 0,
      ...(cursor ? { cursor: { id: cursor } } : {}),
      where,
      orderBy,
    });

    const hasMore = milestones.length > pageSize;
    if (hasMore) milestones.pop();

    const rows: MilestoneListRow[] = milestones.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      due_date: m.due_date,
      status: m.status,
    }));

    return {
      rows,
      nextCursor: hasMore ? milestones[milestones.length - 1].id : null,
    };
  },
);

export const getMilestoneRowById = cache(async (id: string): Promise<MilestoneRow | null> => {
  const milestone = await prisma.caseMilestone.findUnique({ where: { id } });
  if (!milestone) return null;

  return {
    id: milestone.id,
    title: milestone.title,
    description: milestone.description,
    due_date: milestone.due_date,
    status: milestone.status,
  };
});

// ----- Access context -----

export const getMilestoneAccessContext = cache(
  async ({ userId, milestoneId }: MilestoneAccessPayload): Promise<AccessContext> => {
    const milestone = await prisma.caseMilestone.findUnique({
      where: { id: milestoneId },
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
      },
    });

    if (!milestone) {
      return { assigned: false, own: false };
    }

    return {
      assigned: milestone.case.caseAssignments.length > 0,
      own: milestone.created_by_user_id === userId,
    };
  },
);
