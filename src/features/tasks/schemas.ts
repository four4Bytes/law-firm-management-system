import { z } from "zod";

import { TaskStatus } from "@/generated/prisma/browser";
import { optionalText, requiredEnum, requiredText, uniqueUuidArray } from "@/lib/form-utils";

export const TaskIdSchema = z.object({
  taskId: z.uuid(),
});

export const TaskCreatePayloadSchema = z.object({
  title: requiredText(500, "Title"),
  description: optionalText(10000, "Description"),
  status: requiredEnum(TaskStatus, "Status").optional().default(TaskStatus.Pending),
  case_id: z.uuid(),
  assignee_ids: uniqueUuidArray("Assignee").optional(),
});

export const TaskUpdatePayloadSchema = z.object({
  taskId: z.uuid(),
  title: requiredText(500, "Title"),
  description: optionalText(10000, "Description"),
  status: requiredEnum(TaskStatus, "Status"),
  assignee_ids: uniqueUuidArray("Assignee").optional(),
});
