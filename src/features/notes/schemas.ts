import { z } from "zod";

export const NotePageQuerySchema = z.object({
  noteId: z.uuid(),
});

export const NoteCreatePayloadSchema = z
  .object({
    content: z.string().trim().min(1).max(10000),
    case_id: z.uuid().nullable().optional(),
    consultation_id: z.uuid().nullable().optional(),
  })
  .refine(({ case_id, consultation_id }) => Boolean(case_id) !== Boolean(consultation_id), {
    message: "Provide exactly one of case_id or consultation_id",
  });

export const NoteUpdatePayloadSchema = z.object({
  noteId: z.uuid(),
  content: z.string().trim().min(1).max(10000),
});

export const NoteIdSchema = z.object({
  noteId: z.uuid(),
});
