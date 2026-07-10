import { z } from "zod";

import { SortQuerySchema } from "@/lib/schemas";

export const DocumentPageQuerySchema = z.object({
  caseId: z.uuid().optional(),
  consultationId: z.uuid().optional(),
  search: z.string().trim().max(500).optional().default(""),
  cursor: z.uuid().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  sort: SortQuerySchema.optional(),
});

export const DocumentUploadPayloadSchema = z.object({
  file_name: z.string().trim().min(1).max(500),
  file_type: z.string().trim().min(1).max(100),
  case_id: z.uuid().nullable().optional(),
  consultation_id: z.uuid().nullable().optional(),
});

export const DocumentConfirmPayloadSchema = z.object({
  file_name: z.string().trim().min(1).max(500),
  file_type: z.string().trim().min(1).max(100),
  file_size: z.coerce.number().int().positive(),
  file_path: z.string().trim().min(1).max(1000),
  case_id: z.uuid().nullable().optional(),
  consultation_id: z.uuid().nullable().optional(),
});

export const DocumentIdSchema = z.object({
  documentId: z.uuid(),
});
