import { z } from "zod";

export const AuditLogPageQuerySchema = z.object({
  search: z.string().trim().max(500).optional().default(""),
  cursor: z.uuid().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type AuditLogPageQueryPayload = z.infer<typeof AuditLogPageQuerySchema>;

export const EntityActivityLogQuerySchema = z.object({
  entityType: z.string().trim().min(1).max(100),
  entityId: z.string().trim().min(1).max(255),
  search: z.string().trim().max(500).optional().default(""),
  cursor: z.uuid().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type EntityActivityLogQueryPayload = z.infer<typeof EntityActivityLogQuerySchema>;
