"use server";

import { z } from "zod";

import { getCaseAccessContext } from "@/features/cases/queries";
import { getConsultationAccessContext } from "@/features/consultations/queries";
import { requireAuth, requirePermission } from "@/lib/auth-guards";
import { ForbiddenError } from "@/lib/errors";
import { can } from "@/lib/rbac";

import { AuditLogRow, getAuditLogPaginated, getEntityActivityLogPaginated } from "./queries";
import { AuditLogPageQuerySchema, EntityActivityLogQuerySchema } from "./schemas";

export async function getAuditLogAction(
  params: z.input<typeof AuditLogPageQuerySchema>,
): Promise<{ rows: AuditLogRow[]; nextCursor: string | null }> {
  await requirePermission("activity.read");

  const parsed = AuditLogPageQuerySchema.safeParse(params);
  if (!parsed.success) throw new Error("Invalid query parameters");

  return getAuditLogPaginated(parsed.data);
}

export async function getEntityActivityLogAction(
  params: z.input<typeof EntityActivityLogQuerySchema>,
): Promise<{ rows: AuditLogRow[]; nextCursor: string | null }> {
  const session = await requireAuth();

  const parsed = EntityActivityLogQuerySchema.safeParse(params);
  if (!parsed.success) throw new Error("Invalid query parameters");

  const { entityType, entityId } = parsed.data;
  if (entityType === "Case") {
    const access = await getCaseAccessContext(session.id, entityId);
    if (!can(session.role, "case.activity.read", access)) throw new ForbiddenError();
  } else if (entityType === "Consultation") {
    const access = await getConsultationAccessContext(session.id, entityId);
    if (!can(session.role, "consultation.activity.read", access)) throw new ForbiddenError();
  } else {
    throw new Error("Invalid entity type");
  }

  return getEntityActivityLogPaginated(parsed.data);
}
