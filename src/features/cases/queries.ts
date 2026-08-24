import { notFound } from "next/navigation";
import { cache } from "react";

import type { NoteRow } from "@/features/notes/queries";
import type { TaskRow } from "@/features/tasks/queries";
import type { Case, CaseMilestone, Prisma } from "@/generated/prisma/browser";
import { prisma } from "@/lib/prisma";
import type { AccessContext } from "@/lib/rbac";
import type { PageQuery } from "@/lib/types";

export interface CasePageQuery extends PageQuery {
  caseId: string;
}

const caseSelect = {
  id: true,
  case_title: true,
  case_type: true,
  created_at: true,
  client: { select: { name: true } },
  caseAssignments: {
    where: { user: { is_active: true } },
    select: { user: { select: { name: true } } },
    orderBy: [
      { created_at: "asc" },
      { user: { name: "asc" } },
      { user_id: "asc" },
    ] satisfies Prisma.CaseAssignmentOrderByWithRelationInput[],
  },
  status: true,
  milestones: {
    orderBy: { created_at: "desc" as const },
    take: 1,
    select: { title: true },
  },
} as const;

export type CaseRow = {
  id: string;
  case_title: string;
  case_type: string;
  clientName: string;
  assignTo: string;
  latestMilestone: string;
  status: string;
  created_at: Date;
};

export const getCasesPaginated = cache(
  async (
    { search = "", cursor, pageSize = 20, sort }: PageQuery,
    assignedUserId?: string,
  ): Promise<{
    cases: CaseRow[];
    nextCursor: string | null;
  }> => {
    const where = {
      ...(search
        ? {
            OR: [
              { case_title: { contains: search, mode: "insensitive" as const } },
              { client: { name: { contains: search, mode: "insensitive" as const } } },
            ],
          }
        : {}),
      ...(assignedUserId ? { caseAssignments: { some: { user_id: assignedUserId } } } : {}),
    };

    const defaultOrderBy = { created_at: "desc" } as const;

    const orderBy =
      sort?.column === "case_title"
        ? [{ case_title: sort.direction }, { id: "asc" as const }]
        : sort?.column === "clientName"
          ? [{ client: { name: sort.direction } }, { id: "asc" as const }]
          : sort?.column === "case_type"
            ? [{ case_type: sort.direction }, { id: "asc" as const }]
            : sort?.column === "status"
              ? [{ status: sort.direction }, { id: "asc" as const }]
              : defaultOrderBy;

    const cases = await prisma.case.findMany({
      take: pageSize + 1,
      skip: cursor ? 1 : 0,
      ...(cursor ? { cursor: { id: cursor } } : {}),
      where,
      orderBy,
      select: caseSelect,
    });

    const hasMore = cases.length > pageSize;
    if (hasMore) cases.pop();

    const rows: CaseRow[] = cases.map((c) => ({
      id: c.id,
      case_title: c.case_title,
      case_type: c.case_type,
      clientName: c.client.name,
      assignTo: c.caseAssignments.map((a) => a.user.name).join(", "),
      latestMilestone: c.milestones[0]?.title ?? "",
      status: c.status,
      created_at: c.created_at,
    }));

    return {
      cases: rows,
      nextCursor: hasMore ? cases[cases.length - 1].id : null,
    };
  },
);

// ----- Case Detail -----

export type CaseOverviewData = {
  id: string;
  case_title: string;
  case_type: string;
  status: string;
  parties_involved: string | null;
  created_at: Date;
  updated_at: Date;
  client: {
    name: string;
    phone_number: string | null;
    email: string | null;
    address: string | null;
  };
  createdBy: { name: string };
  assignTo: { id: string; name: string }[];
  latestMilestone: { title: string; status: string } | null;
  sourceConsultation: { id: string; concern: string } | null;
};

export const getCaseOverviewById = cache(async (id: string): Promise<CaseOverviewData> => {
  const data = await prisma.case.findUnique({
    where: { id },
    include: {
      client: true,
      createdBy: { select: { name: true } },
      caseAssignments: {
        where: { user: { is_active: true } },
        include: { user: { select: { id: true, name: true } } },
        orderBy: [
          { created_at: "asc" },
          { user: { name: "asc" } },
          { user_id: "asc" },
        ] satisfies Prisma.CaseAssignmentOrderByWithRelationInput[],
      },
      milestones: {
        orderBy: { created_at: "desc" },
        take: 1,
      },
      sourceConsultation: {
        select: { id: true, concern: true },
      },
    },
  });

  if (!data) notFound();

  return {
    id: data.id,
    case_title: data.case_title,
    case_type: data.case_type,
    status: data.status,
    parties_involved: data.parties_involved,
    created_at: data.created_at,
    updated_at: data.updated_at,
    client: {
      name: data.client.name,
      phone_number: data.client.phone_number,
      email: data.client.email,
      address: data.client.address,
    },
    createdBy: data.createdBy,
    assignTo: data.caseAssignments.map((a) => ({ id: a.user.id, name: a.user.name })),
    latestMilestone: data.milestones[0]
      ? { title: data.milestones[0].title, status: data.milestones[0].status }
      : null,
    sourceConsultation: data.sourceConsultation,
  } satisfies CaseOverviewData;
});

// ----- Tasks -----

export const getCaseTasksPaginated = cache(
  async ({
    caseId,
    search = "",
    cursor,
    pageSize = 20,
    sort,
  }: CasePageQuery): Promise<{
    rows: TaskRow[];
    nextCursor: string | null;
  }> => {
    const where = {
      case_id: caseId,
      ...(search ? { title: { contains: search, mode: "insensitive" as const } } : {}),
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

// ----- Notes -----

export const getCaseNotesPaginated = cache(
  async ({
    caseId,
    search = "",
    cursor,
    pageSize = 20,
  }: CasePageQuery): Promise<{
    rows: NoteRow[];
    nextCursor: string | null;
  }> => {
    const where = {
      case_id: caseId,
      ...(search ? { content: { contains: search, mode: "insensitive" as const } } : {}),
    };

    const orderBy = { created_at: "desc" } as const;

    const notes = await prisma.note.findMany({
      take: pageSize + 1,
      skip: cursor ? 1 : 0,
      ...(cursor ? { cursor: { id: cursor } } : {}),
      where,
      orderBy,
      include: {
        createdBy: { select: { name: true } },
      },
    });

    const hasMore = notes.length > pageSize;
    if (hasMore) notes.pop();

    const rows: NoteRow[] = notes.map((n) => ({
      id: n.id,
      content: n.content,
      author: n.createdBy.name,
      created_at: n.created_at,
    }));

    return { rows, nextCursor: hasMore ? notes[notes.length - 1].id : null };
  },
);

// ----- Milestones -----

export type CaseMilestoneListRow = Pick<
  CaseMilestone,
  "id" | "title" | "description" | "due_date" | "status"
>;

export const getCaseMilestonesPaginated = cache(
  async ({
    caseId,
    search = "",
    cursor,
    pageSize = 20,
    sort,
  }: CasePageQuery): Promise<{
    rows: CaseMilestoneListRow[];
    nextCursor: string | null;
  }> => {
    const where = {
      case_id: caseId,
      ...(search ? { title: { contains: search, mode: "insensitive" as const } } : {}),
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

    const rows: CaseMilestoneListRow[] = milestones.map((m) => ({
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

// ----- Case edit data -----

export const getCaseAssigneeIds = cache(async (caseId: string): Promise<string[]> => {
  const assignments = await prisma.caseAssignment.findMany({
    where: { case_id: caseId, user: { is_active: true } },
    select: { user_id: true },
  });
  return assignments.map((a) => a.user_id);
});

export type CaseEditData = Pick<
  Case,
  | "id"
  | "client_id"
  | "case_title"
  | "case_type"
  | "status"
  | "parties_involved"
  | "source_consultation_id"
> & { assignee_ids: string[] };

export const getCaseBySourceConsultationId = cache(
  async (sourceConsultationId: string): Promise<{ id: string } | null> => {
    return prisma.case.findFirst({
      where: { source_consultation_id: sourceConsultationId },
      select: { id: true },
    });
  },
);

export const getCaseEditData = cache(async (id: string): Promise<CaseEditData | null> => {
  const data = await prisma.case.findUnique({
    where: { id },
    select: {
      id: true,
      client_id: true,
      case_title: true,
      case_type: true,
      status: true,
      parties_involved: true,
      source_consultation_id: true,
      caseAssignments: {
        select: { user_id: true },
      },
    },
  });

  if (!data) return null;

  return {
    id: data.id,
    client_id: data.client_id,
    case_title: data.case_title,
    case_type: data.case_type,
    status: data.status,
    parties_involved: data.parties_involved,
    source_consultation_id: data.source_consultation_id,
    assignee_ids: data.caseAssignments.map((a) => a.user_id),
  };
});

// ----- Access context -----

export const getCaseAccessContext = cache(
  async (userId: string, caseId: string): Promise<AccessContext> => {
    const [assignment, caseRecord] = await Promise.all([
      prisma.caseAssignment.findFirst({
        where: { case_id: caseId, user_id: userId },
        select: { id: true },
      }),
      prisma.case.findUnique({
        where: { id: caseId },
        select: { created_by_user_id: true },
      }),
    ]);

    return {
      assigned: assignment !== null,
      own: caseRecord?.created_by_user_id === userId,
    };
  },
);
