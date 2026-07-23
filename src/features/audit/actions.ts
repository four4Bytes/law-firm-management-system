"use server";

import { requireAuth } from "@/lib/auth-guards";

import { getAuditLogPaginated, getEntityActivityLogPaginated } from "./queries";
import { AuditLogPageQuerySchema, EntityActivityLogQuerySchema } from "./schemas";

export async function getAuditLogAction(raw: unknown) {
  await requireAuth();

  const parsed = AuditLogPageQuerySchema.safeParse(raw);
  if (!parsed.success) throw new Error("Invalid query parameters");

  return getAuditLogPaginated(parsed.data);
}

export async function getEntityActivityLogAction(raw: unknown) {
  await requireAuth();

  const parsed = EntityActivityLogQuerySchema.safeParse(raw);
  if (!parsed.success) throw new Error("Invalid query parameters");

  return getEntityActivityLogPaginated(parsed.data);
}
