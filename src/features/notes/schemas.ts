import { z } from "zod";

import { requiredText } from "@/lib/form-utils";
import { exactlyOneParentRefinement, PageQuerySchema } from "@/lib/schemas";

export const NotePageQuerySchema = PageQuerySchema.extend({
  noteId: z.uuid(),
});

export const NoteCreatePayloadSchema = z
  .object({
    content: requiredText(10000, "Content"),
    case_id: z.uuid().nullable().optional(),
    consultation_id: z.uuid().nullable().optional(),
    task_id: z.uuid().nullable().optional(),
  })
  .refine(exactlyOneParentRefinement, {
    message: "Provide exactly one of case_id, consultation_id, or task_id",
  });

export const NoteUpdatePayloadSchema = z.object({
  noteId: z.uuid(),
  content: requiredText(10000, "Content"),
});

export const NoteIdSchema = z.object({
  noteId: z.uuid(),
});

export const TaskNotesPageQuerySchema = z.object({
  taskId: z.uuid(),
  search: z.string().trim().max(500).optional().default(""),
  cursor: z.uuid().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const CaseNotesPageQuerySchema = z.object({
  caseId: z.uuid(),
  search: z.string().trim().max(500).optional().default(""),
  cursor: z.uuid().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});
