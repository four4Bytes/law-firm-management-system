import { z } from "zod";

export const AuditLogListQuerySchema = z.object({
  search: z.string().trim().max(500).optional().default(""),
  cursor: z.uuid().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type AuditLogListQueryPayload = z.infer<typeof AuditLogListQuerySchema>;

export const EntityActivityLogListQuerySchema = z.object({
  entityType: z.string().trim().min(1).max(100),
  entityId: z.uuid(),
  search: z.string().trim().max(500).optional().default(""),
  cursor: z.uuid().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type EntityActivityLogListQueryPayload = z.infer<typeof EntityActivityLogListQuerySchema>;
