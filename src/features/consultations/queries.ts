import { cache } from "react";

import { getDocumentsPaginated } from "@/features/documents/queries";
import { prisma } from "@/lib/prisma";
import type { PageQuery } from "@/lib/types";

export interface ConsultationPageQuery extends PageQuery {
  consultationId: string;
}

const consultationSelect = {
  id: true,
  concern: true,
  booking_datetime: true,
  status: true,
  client: { select: { name: true } },
  createdBy: { select: { name: true } },
} as const;

export type ConsultationRow = {
  id: string;
  clientName: string;
  concern: string;
  createdByName: string;
  booking_datetime: Date;
  status: string;
};

// ----- Consultation Detail -----

export type ConsultationOverviewData = {
  id: string;
  concern: string;
  booking_datetime: Date;
  status: string;
  created_at: Date;
  updated_at: Date;
  client: {
    name: string;
    phone_number: string | null;
    email: string | null;
    address: string | null;
  };
  createdBy: { name: string };
  relatedCase: { id: string; case_title: string } | null;
};

export const getConsultationOverviewById = cache(
  async (id: string): Promise<ConsultationOverviewData> => {
    const data = await prisma.consultation.findUniqueOrThrow({
      where: { id },
      include: {
        client: true,
        createdBy: { select: { name: true } },
        cases: { select: { id: true, case_title: true }, take: 1 },
      },
    });

    return {
      id: data.id,
      concern: data.concern,
      booking_datetime: data.booking_datetime,
      status: data.status,
      created_at: data.created_at,
      updated_at: data.updated_at,
      client: {
        name: data.client.name,
        phone_number: data.client.phone_number,
        email: data.client.email,
        address: data.client.address,
      },
      createdBy: data.createdBy,
      relatedCase: data.cases[0] ?? null,
    } satisfies ConsultationOverviewData;
  },
);

// ----- Notes -----

export type NoteRow = {
  id: string;
  content: string;
  author: string;
  created_at: Date;
};

export const getConsultationNotesPaginated = cache(
  async ({
    consultationId,
    search = "",
    cursor,
    pageSize = 20,
  }: ConsultationPageQuery): Promise<{
    rows: NoteRow[];
    nextCursor: string | null;
  }> => {
    const where = {
      consultation_id: consultationId,
      ...(search ? { content: { contains: search, mode: "insensitive" as const } } : {}),
    };

    const notes = await prisma.note.findMany({
      take: pageSize + 1,
      skip: cursor ? 1 : 0,
      ...(cursor ? { cursor: { id: cursor } } : {}),
      where,
      orderBy: { created_at: "desc" },
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

export const getConsultationDocumentsPaginated = cache(
  async ({
    consultationId,
    search,
    cursor,
    pageSize,
    sort,
  }: ConsultationPageQuery): Promise<{
    rows: DocumentRow[];
    nextCursor: string | null;
  }> => getDocumentsPaginated({ consultationId, search, cursor, pageSize, sort }),
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

export const getConsultationPaymentsPaginated = cache(
  async ({
    consultationId,
    search = "",
    cursor,
    pageSize = 20,
  }: ConsultationPageQuery): Promise<{
    rows: PaymentRow[];
    nextCursor: string | null;
  }> => {
    const where: Record<string, unknown> = { consultation_id: consultationId };
    if (search) {
      where.OR = [
        { payment_method: { contains: search, mode: "insensitive" as const } },
        { status: { contains: search, mode: "insensitive" as const } },
        { receipt_number: { contains: search, mode: "insensitive" as const } },
      ];
    }

    const payments = await prisma.payment.findMany({
      take: pageSize + 1,
      skip: cursor ? 1 : 0,
      ...(cursor ? { cursor: { id: cursor } } : {}),
      where,
      orderBy: { payment_date: "desc" },
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

export const getConsultationActivityLogPaginated = cache(
  async ({
    consultationId,
    search = "",
    cursor,
    pageSize = 20,
  }: ConsultationPageQuery): Promise<{
    rows: ActivityLogRow[];
    nextCursor: string | null;
  }> => {
    const where: Record<string, unknown> = {
      entity_type: "Consultation",
      entity_id: consultationId,
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

export const getConsultationsPaginated = cache(
  async ({
    search = "",
    cursor,
    pageSize = 20,
    sort,
  }: PageQuery): Promise<{
    consultations: ConsultationRow[];
    nextCursor: string | null;
  }> => {
    const where = search
      ? {
          OR: [
            { concern: { contains: search, mode: "insensitive" as const } },
            { client: { name: { contains: search, mode: "insensitive" as const } } },
          ],
        }
      : undefined;

    const defaultOrderBy = { booking_datetime: "desc" } as const;

    const orderBy =
      sort?.column === "clientName"
        ? [{ client: { name: sort.direction } }, { id: "asc" as const }]
        : sort?.column === "concern"
          ? [{ concern: sort.direction }, { id: "asc" as const }]
          : sort?.column === "createdByName"
            ? [{ createdBy: { name: sort.direction } }, { id: "asc" as const }]
            : sort?.column === "booking_datetime"
              ? [{ booking_datetime: sort.direction }, { id: "asc" as const }]
              : sort?.column === "status"
                ? [{ status: sort.direction }, { id: "asc" as const }]
                : defaultOrderBy;

    const consultations = await prisma.consultation.findMany({
      take: pageSize + 1,
      skip: cursor ? 1 : 0,
      ...(cursor ? { cursor: { id: cursor } } : {}),
      where,
      orderBy,
      select: consultationSelect,
    });

    const hasMore = consultations.length > pageSize;
    if (hasMore) consultations.pop();

    const rows: ConsultationRow[] = consultations.map((c) => ({
      id: c.id,
      clientName: c.client.name,
      concern: c.concern,
      createdByName: c.createdBy.name,
      booking_datetime: c.booking_datetime,
      status: c.status,
    }));

    return {
      consultations: rows,
      nextCursor: hasMore ? consultations[consultations.length - 1].id : null,
    };
  },
);
