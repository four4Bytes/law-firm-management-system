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
  })
  .refine(exactlyOneParentRefinement, {
    message: "Provide exactly one of case_id or consultation_id",
  });

export const NoteUpdatePayloadSchema = z.object({
  noteId: z.uuid(),
  content: z.string().trim().min(1).max(10000),
});

export const NoteIdSchema = z.object({
  noteId: z.uuid(),
});
