import { z } from "zod";

import { optionalText, requiredText, uniqueUuidArray } from "@/lib/validation/form-utils";

export const SubtaskIdSchema = z.object({ subtaskId: z.uuid() });

export const SubtaskCreatePayloadSchema = z.object({
  taskId: z.uuid(),
  title: requiredText(500, "Title"),
  description: optionalText(10000, "Description"),
  due_date: z.coerce.date(),
  assignee_ids: uniqueUuidArray("Assignee").min(1, "At least one assignee is required."),
});

export const SubtaskUpdatePayloadSchema = z.object({
  subtaskId: z.uuid(),
  title: requiredText(500, "Title"),
  description: optionalText(10000, "Description"),
  due_date: z.coerce.date(),
  assignee_ids: uniqueUuidArray("Assignee").min(1, "At least one assignee is required.").optional(),
});

export const SubtaskCompleteSchema = z.object({ subtaskId: z.uuid() });
