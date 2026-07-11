import { cache } from "react";

import { getDocumentsPaginated } from "@/features/documents/queries";
import type { TaskRow } from "@/features/tasks/queries";
import { prisma } from "@/lib/prisma";
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
    select: { user: { select: { name: true } } },
  },
  milestones: {
    orderBy: { created_at: "desc" as const },
    take: 1,
    select: { title: true, status: true },
  },
} as const;

export type CaseRow = {
  id: string;
  case_title: string;
  case_type: string;
  clientName: string;
  assignTo: string;
  latestMilestone: string;
  status: string | null;
  created_at: Date;
};

export const getCasesPaginated = cache(
  async ({
    search = "",
    cursor,
    pageSize = 20,
    sort,
  }: PageQuery): Promise<{
    cases: CaseRow[];
    nextCursor: string | null;
  }> => {
    const where = search
      ? {
          OR: [
            { case_title: { contains: search, mode: "insensitive" as const } },
            { client: { name: { contains: search, mode: "insensitive" as const } } },
          ],
        }
      : undefined;

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
      status: c.milestones[0]?.status ?? null,
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
  assignTo: string;
  latestMilestone: { title: string; status: string } | null;
  sourceConsultation: { id: string; concern: string } | null;
};

export const getCaseOverviewById = cache(async (id: string): Promise<CaseOverviewData> => {
  const data = await prisma.case.findUniqueOrThrow({
    where: { id },
    include: {
      client: true,
      createdBy: { select: { name: true } },
      caseAssignments: {
        include: { user: { select: { name: true } } },
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
    assignTo: data.caseAssignments.map((a) => a.user.name).join(", "),
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
      },
    });

    const hasMore = tasks.length > pageSize;
    if (hasMore) tasks.pop();

    const rows: TaskRow[] = tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      assignTo: t.taskAssignments.map((a) => a.user.name).join(", "),
      updated_at: t.updated_at,
    }));

    return { rows, nextCursor: hasMore ? tasks[tasks.length - 1].id : null };
  },
);

// ----- Notes -----

export type NoteRow = {
  id: string;
  content: string;
  author: string;
  created_at: Date;
};

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

// ----- Documents (Attachments) -----

export type DocumentRow = {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number | null;
  uploadedBy: string;
  created_at: Date;
};

export const getCaseDocumentsPaginated = cache(
  async ({
    caseId,
    search,
    cursor,
    pageSize,
    sort,
  }: CasePageQuery): Promise<{
    rows: DocumentRow[];
    nextCursor: string | null;
  }> => getDocumentsPaginated({ caseId, search, cursor, pageSize, sort }),
);

// ----- Milestones -----

export type MilestoneRow = {
  id: string;
  title: string;
  due_date: Date;
  status: string;
};

export const getCaseMilestonesPaginated = cache(
  async ({
    caseId,
    search = "",
    cursor,
    pageSize = 20,
    sort,
  }: CasePageQuery): Promise<{
    rows: MilestoneRow[];
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

    const rows: MilestoneRow[] = milestones.map((m) => ({
      id: m.id,
      title: m.title,
      due_date: m.due_date,
      status: m.status,
    }));

    return {
      rows,
      nextCursor: hasMore ? milestones[milestones.length - 1].id : null,
    };
  },
);

// ----- Payments -----

export type PaymentRow = {
  id: string;
  amount: number;
  payment_date: Date;
  payment_method: string | null;
  receipt_number: string | null;
  status: string;
};

export const getCasePaymentsPaginated = cache(
  async ({
    caseId,
    search = "",
    cursor,
    pageSize = 20,
    sort,
  }: CasePageQuery): Promise<{
    rows: PaymentRow[];
    nextCursor: string | null;
  }> => {
    const where: Record<string, unknown> = { case_id: caseId };
    if (search) {
      where.OR = [
        { payment_method: { contains: search, mode: "insensitive" as const } },
        { status: { contains: search, mode: "insensitive" as const } },
        { receipt_number: { contains: search, mode: "insensitive" as const } },
      ];
    }

    const defaultOrderBy = { payment_date: "desc" } as const;

    const orderBy =
      sort?.column === "amount"
        ? [{ amount: sort.direction }, { id: "asc" as const }]
        : sort?.column === "payment_date"
          ? [{ payment_date: sort.direction }, { id: "asc" as const }]
          : sort?.column === "status"
            ? [{ status: sort.direction }, { id: "asc" as const }]
            : defaultOrderBy;

    const payments = await prisma.payment.findMany({
      take: pageSize + 1,
      skip: cursor ? 1 : 0,
      ...(cursor ? { cursor: { id: cursor } } : {}),
      where,
      orderBy,
    });

    const hasMore = payments.length > pageSize;
    if (hasMore) payments.pop();

    const rows: PaymentRow[] = payments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      payment_date: p.payment_date,
      payment_method: p.payment_method,
      receipt_number: p.receipt_number,
      status: p.status,
    }));

    return {
      rows,
      nextCursor: hasMore ? payments[payments.length - 1].id : null,
    };
  },
);

// ----- Activity Log -----

export type ActivityLogRow = {
  id: string;
  action: string;
  actor: string;
  details: string | null;
  created_at: Date;
};

export const getCaseActivityLogPaginated = cache(
  async ({
    caseId,
    search = "",
    cursor,
    pageSize = 20,
  }: CasePageQuery): Promise<{
    rows: ActivityLogRow[];
    nextCursor: string | null;
  }> => {
    const where: Record<string, unknown> = {
      entity_type: "Case",
      entity_id: caseId,
    };

    if (search) {
      where.OR = [
        { action: { contains: search, mode: "insensitive" as const } },
        { details: { contains: search, mode: "insensitive" as const } },
      ];
    }

    const logs = await prisma.auditLog.findMany({
      take: pageSize + 1,
      skip: cursor ? 1 : 0,
      ...(cursor ? { cursor: { id: cursor } } : {}),
      where,
      orderBy: { created_at: "desc" },
      include: {
        actor: { select: { name: true } },
      },
    });

    const hasMore = logs.length > pageSize;
    if (hasMore) logs.pop();

    const rows: ActivityLogRow[] = logs.map((l) => ({
      id: l.id,
      action: l.action,
      actor: l.actor.name,
      details: l.details,
      created_at: l.created_at,
    }));

    return {
      rows,
      nextCursor: hasMore ? logs[logs.length - 1].id : null,
    };
  },
);
