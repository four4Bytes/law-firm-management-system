"use server";

import { z } from "zod";

import { requireAuth } from "@/lib/auth-guards";

import { AuditLogRow, getAuditLogPaginated, getEntityActivityLogPaginated } from "./queries";
import { AuditLogPageQuerySchema, EntityActivityLogQuerySchema } from "./schemas";

export async function getAuditLogAction(
  params: z.input<typeof AuditLogPageQuerySchema>,
): Promise<{ rows: AuditLogRow[]; nextCursor: string | null }> {
  await requireAuth();

  const parsed = AuditLogPageQuerySchema.safeParse(params);
  if (!parsed.success) throw new Error("Invalid query parameters");

  return getAuditLogPaginated(parsed.data);
}

export async function getEntityActivityLogAction(
  params: z.input<typeof EntityActivityLogQuerySchema>,
): Promise<{ rows: AuditLogRow[]; nextCursor: string | null }> {
  await requireAuth();

  const parsed = EntityActivityLogQuerySchema.safeParse(params);
  if (!parsed.success) throw new Error("Invalid query parameters");

  return getEntityActivityLogPaginated(parsed.data);
}
