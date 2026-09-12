import { z } from "zod";

import { SubtaskStatus } from "@/generated/prisma/browser";
import {
  nonNegativeInteger,
  optionalText,
  requiredEnum,
  requiredText,
  uniqueUuidArray,
} from "@/lib/form-utils";

export const SubtaskIdSchema = z.object({
  subtaskId: z.uuid(),
});

const SubtaskFieldsSchema = z.object({
  title: requiredText(500, "Title"),
  description: optionalText(10000, "Description"),
  priority: optionalText(50, "Priority"),
  due_date: z.coerce.date().nullable().optional(),
  status: requiredEnum(SubtaskStatus, "Status"),
  reminder_days: nonNegativeInteger("Reminder days").nullable().optional(),
  assignee_ids: uniqueUuidArray("Assignee").min(1, "Add at least one assignee"),
});

export const SubtaskCreatePayloadSchema = SubtaskFieldsSchema.omit({ status: true })
  .extend({
    task_id: z.uuid(),
    status: requiredEnum(SubtaskStatus, "Status").optional().default(SubtaskStatus.Pending),
  })
  .refine(
    (data) =>
      data.due_date === undefined ||
      data.due_date === null ||
      !Number.isNaN(data.due_date.getTime()),
    {
      message: "Due date must be a valid date",
      path: ["due_date"],
    },
  );

export const SubtaskUpdatePayloadSchema = SubtaskFieldsSchema.extend({
  subtaskId: z.uuid(),
});

export const SubtaskStatusChangeSchema = z.object({
  subtaskId: z.uuid(),
  status: z.enum(SubtaskStatus),
});
