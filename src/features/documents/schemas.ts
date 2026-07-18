import { z } from "zod";

import { requiredText } from "@/lib/form-utils";
import { exactlyOneParentRefinement, SortQuerySchema } from "@/lib/schemas";

export const DocumentPageQuerySchema = z.object({
  caseId: z.uuid().optional(),
  consultationId: z.uuid().optional(),
  search: z.string().trim().max(500).optional().default(""),
  cursor: z.uuid().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  sort: SortQuerySchema.optional(),
});

export const DocumentUploadPayloadSchema = z
  .object({
    file_name: requiredText(500, "File name"),
    file_type: requiredText(100, "File type"),
    case_id: z.uuid().nullable().optional(),
    consultation_id: z.uuid().nullable().optional(),
  })
  .refine(exactlyOneParentRefinement, {
    message: "Provide exactly one of case_id or consultation_id",
  });

export const DocumentConfirmPayloadSchema = z
  .object({
    file_name: requiredText(500, "File name"),
    file_type: requiredText(100, "File type"),
    file_size: z.coerce.number().int().positive(),
    file_path: requiredText(1000, "File path"),
    case_id: z.uuid().nullable().optional(),
    consultation_id: z.uuid().nullable().optional(),
  })
  .refine(exactlyOneParentRefinement, {
    message: "Provide exactly one of case_id or consultation_id",
  });

export const DocumentIdSchema = z.object({
  documentId: z.uuid(),
});
