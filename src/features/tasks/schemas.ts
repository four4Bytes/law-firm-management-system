import { z } from "zod";

import { ReviewDecision, TaskAssignmentStatus, TaskStatus } from "@/generated/prisma/browser";
import { optionalText, requiredText, uniqueUuidArray } from "@/lib/validation/form-utils";
import { PageQuerySchema } from "@/lib/validation/schemas";

export const TaskIdSchema = z.object({
  taskId: z.uuid(),
});

export const TaskListQuerySchema = PageQuerySchema.extend({
  caseId: z.uuid(),
  filters: z
    .object({
      status: z.array(z.enum(TaskStatus)).max(10).optional(),
    })
    .optional(),
});

export const TaskCreatePayloadSchema = z.object({
  title: requiredText(500, "Title"),
  description: optionalText(10000, "Description"),
  case_id: z.uuid(),
  assignee_ids: uniqueUuidArray("Assignee").min(1, "At least one assignee is required"),
});

export const TaskUpdatePayloadSchema = z.object({
  taskId: z.uuid(),
  title: requiredText(500, "Title"),
  description: optionalText(10000, "Description"),
  assignee_ids: uniqueUuidArray("Assignee").optional(),
  reviewer_ids: z.array(z.uuid()).optional(),
  removed_reviewer_ids: z.array(z.uuid()).optional(),
});

export const TaskSubmitSchema = z.object({
  taskId: z.uuid(),
  status: z.enum([TaskAssignmentStatus.Todo, TaskAssignmentStatus.Done]),
});

export const TaskReviewSchema = z.object({
  taskId: z.uuid(),
  decision: z.enum([ReviewDecision.Approved, ReviewDecision.Rejected], {
    error: "Select approve or request changes",
  }),
});

export const TaskAddReviewerSchema = z.object({
  taskId: z.uuid(),
  reviewerUserId: z.uuid(),
});

export const TaskRemoveReviewerSchema = z.object({
  taskId: z.uuid(),
  reviewerUserId: z.uuid(),
});
