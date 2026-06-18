import { cache } from "react";

import { prisma } from "@/lib/prisma";

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

export const getConsultationOverviewById = cache(async (id: string) => {
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
});

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
  }: {
    consultationId: string;
    search?: string;
    cursor?: string;
    pageSize?: number;
  }) => {
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
    search = "",
    cursor,
    pageSize = 20,
  }: {
    consultationId: string;
    search?: string;
    cursor?: string;
    pageSize?: number;
  }) => {
    const where = {
      consultation_id: consultationId,
      ...(search ? { file_name: { contains: search, mode: "insensitive" as const } } : {}),
    };

    const documents = await prisma.document.findMany({
      take: pageSize + 1,
      skip: cursor ? 1 : 0,
      ...(cursor ? { cursor: { id: cursor } } : {}),
      where,
      orderBy: { created_at: "desc" },
      include: {
        uploadedBy: { select: { name: true } },
      },
    });

    const hasMore = documents.length > pageSize;
    if (hasMore) documents.pop();

    const rows: DocumentRow[] = documents.map((d) => ({
      id: d.id,
      file_name: d.file_name,
      file_type: d.file_type,
      file_size: d.file_size,
      uploadedBy: d.uploadedBy.name,
      created_at: d.created_at,
    }));

    return {
      rows,
      nextCursor: hasMore ? documents[documents.length - 1].id : null,
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

export const getConsultationPaymentsPaginated = cache(
  async ({
    consultationId,
    search = "",
    cursor,
    pageSize = 20,
  }: {
    consultationId: string;
    search?: string;
    cursor?: string;
    pageSize?: number;
  }) => {
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
  }: {
    consultationId: string;
    search?: string;
    cursor?: string;
    pageSize?: number;
  }) => {
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
  }: {
    search?: string;
    cursor?: string;
    pageSize?: number;
  }) => {
    const where = search
      ? {
          OR: [
            { concern: { contains: search, mode: "insensitive" as const } },
            { client: { name: { contains: search, mode: "insensitive" as const } } },
          ],
        }
      : undefined;

    const consultations = await prisma.consultation.findMany({
      take: pageSize + 1,
      skip: cursor ? 1 : 0,
      ...(cursor ? { cursor: { id: cursor } } : {}),
      where,
      orderBy: { booking_datetime: "desc" },
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
