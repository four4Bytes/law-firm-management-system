import { z } from "zod";

import { CaseStatus } from "@/generated/prisma/browser";
import { optionalText, requiredEnum, requiredText } from "@/lib/form-utils";
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
  case_title: requiredText(255, "Case title"),
  case_type: requiredText(255, "Case type"),
  status: requiredEnum(CaseStatus, "Status"),
  parties_involved: optionalText(2000, "Parties involved"),
  source_consultation_id: z.uuid().optional(),
});

export const CaseUpdatePayloadSchema = CaseCreatePayloadSchema.extend({
  caseId: z.uuid(),
});

export const CaseDeletePayloadSchema = z.object({
  caseId: z.uuid(),
});

const CaseDataSchema = z.object({
  case_title: requiredText(255, "Case title"),
  case_type: requiredText(255, "Case type"),
  status: requiredEnum(CaseStatus, "Status"),
  parties_involved: optionalText(2000, "Parties involved"),
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
