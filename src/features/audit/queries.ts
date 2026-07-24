import { z } from "zod";

import { prisma } from "@/lib/prisma";

import { AuditLogPageQuerySchema, EntityActivityLogQuerySchema } from "./schemas";

export type AuditLogRow = {
  id: string;
  action: string;
  actor: string;
  entityType: string;
  entityId: string;
  entityExists: boolean;
  details: string | null;
  created_at: Date;
};

async function findAuditLogs(
  where: Record<string, unknown>,
  pageSize: number,
  cursor?: string,
): Promise<{ rows: AuditLogRow[]; hasMore: boolean }> {
  const logs = await prisma.auditLog.findMany({
    take: pageSize + 1,
    skip: cursor ? 1 : 0,
    ...(cursor ? { cursor: { id: cursor } } : {}),
    where,
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    include: { actor: { select: { name: true } } },
  });

  const hasMore = logs.length > pageSize;
  if (hasMore) logs.pop();

  const rows: AuditLogRow[] = logs.map((l) => ({
    id: l.id,
    action: l.action,
    actor: l.actor.name,
    entityType: l.entity_type,
    entityId: l.entity_id,
    entityExists: true,
    details: l.details,
    created_at: l.created_at,
  }));

  return { rows, hasMore };
}

function buildSearchWhere(search: string): Record<string, unknown> {
  return {
    OR: [
      { action: { contains: search, mode: "insensitive" as const } },
      { details: { contains: search, mode: "insensitive" as const } },
    ],
  };
}

async function enrichEntityExistence(rows: AuditLogRow[]): Promise<void> {
  const caseIds = rows.filter((r) => r.entityType === "Case").map((r) => r.entityId);
  const consultationIds = rows
    .filter((r) => r.entityType === "Consultation")
    .map((r) => r.entityId);

  const [existingCases, existingConsultations] = await Promise.all([
    caseIds.length > 0
      ? prisma.case.findMany({ where: { id: { in: caseIds } }, select: { id: true } })
      : [],
    consultationIds.length > 0
      ? prisma.consultation.findMany({
          where: { id: { in: consultationIds } },
          select: { id: true },
        })
      : [],
  ]);

  const existingCaseIds = new Set(existingCases.map((c) => c.id));
  const existingConsultationIds = new Set(existingConsultations.map((c) => c.id));

  for (const row of rows) {
    if (row.entityType === "Case") {
      row.entityExists = existingCaseIds.has(row.entityId);
    } else if (row.entityType === "Consultation") {
      row.entityExists = existingConsultationIds.has(row.entityId);
    }
  }
}

export async function getAuditLogPaginated(
  params: z.input<typeof AuditLogPageQuerySchema>,
): Promise<{ rows: AuditLogRow[]; nextCursor: string | null }> {
  const parsed = AuditLogPageQuerySchema.parse(params);
  const { search, cursor, pageSize } = parsed;

  const where: Record<string, unknown> = {};
  if (search) where.OR = buildSearchWhere(search).OR;

  const { rows, hasMore } = await findAuditLogs(where, pageSize, cursor);
  await enrichEntityExistence(rows);
  return { rows, nextCursor: hasMore ? rows[rows.length - 1].id : null };
}

export async function getEntityActivityLogPaginated(
  params: z.input<typeof EntityActivityLogQuerySchema>,
): Promise<{ rows: AuditLogRow[]; nextCursor: string | null }> {
  const parsed = EntityActivityLogQuerySchema.parse(params);
  const { entityType, entityId, search, cursor, pageSize } = parsed;

  const where: Record<string, unknown> = {
    entity_type: entityType,
    entity_id: entityId,
  };
  if (search) where.OR = buildSearchWhere(search).OR;

  const { rows, hasMore } = await findAuditLogs(where, pageSize, cursor);
  await enrichEntityExistence(rows);
  return { rows, nextCursor: hasMore ? rows[rows.length - 1].id : null };
}
