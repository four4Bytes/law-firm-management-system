import { z } from "zod";

import { CaseStatus } from "@/generated/prisma/client";
import { ClientDataSchema, SortQuerySchema } from "@/lib/schemas";

export const CasePageQuerySchema = z.object({
  caseId: z.uuid(),
  search: z.string().trim().max(500).optional().default(""),
  cursor: z.uuid().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  sort: SortQuerySchema.optional(),
});

export const CaseOverviewIdSchema = z.object({
  caseId: z.uuid(),
});

export const CaseCreatePayloadSchema = z.object({
  client_id: z.uuid(),
  case_title: z.string().trim().min(1).max(255),
  case_type: z.string().trim().min(1).max(255),
  status: z.enum(CaseStatus),
  parties_involved: z.string().trim().min(1).max(2000).optional(),
  source_consultation_id: z.uuid().optional(),
});

export const CaseUpdatePayloadSchema = CaseCreatePayloadSchema.extend({
  caseId: z.uuid(),
});

export const CaseDeletePayloadSchema = z.object({
  caseId: z.uuid(),
});

const CaseDataSchema = z.object({
  case_title: z.string().trim().min(1).max(255),
  case_type: z.string().trim().min(1).max(255),
  status: z.enum(CaseStatus),
  parties_involved: z.string().trim().min(1).max(2000).optional(),
});

export const CaseWithClientCreatePayloadSchema = z.object({
  client: ClientDataSchema,
  case: CaseDataSchema,
});

export const CaseWithClientUpdatePayloadSchema = z.object({
  case_id: z.uuid(),
  client_id: z.uuid(),
  client: ClientDataSchema,
  case: CaseDataSchema,
});

export type CaseCreatePayload = z.infer<typeof CaseCreatePayloadSchema>;
export type CaseUpdatePayload = z.infer<typeof CaseUpdatePayloadSchema>;
export type CaseDeletePayload = z.infer<typeof CaseDeletePayloadSchema>;
export type CaseWithClientCreatePayload = z.infer<typeof CaseWithClientCreatePayloadSchema>;
export type CaseWithClientUpdatePayload = z.infer<typeof CaseWithClientUpdatePayloadSchema>;
