import { z } from "zod";

import { ReviewDecision, TaskAssignmentStatus } from "@/generated/prisma/browser";
import { optionalText, requiredText, uniqueUuidArray } from "@/lib/form-utils";

export const TaskIdSchema = z.object({
  taskId: z.uuid(),
});

export const TaskCreatePayloadSchema = z.object({
  title: requiredText(500, "Title"),
  description: optionalText(10000, "Description"),
  case_id: z.uuid(),
  assignee_ids: uniqueUuidArray("Assignee").min(1, "Add at least one assignee"),
});

export const TaskUpdatePayloadSchema = z.object({
  taskId: z.uuid(),
  title: requiredText(500, "Title"),
  description: optionalText(10000, "Description"),
  assignee_ids: uniqueUuidArray("Assignee").optional(),
});

export const TaskSubmitSchema = z.object({
  taskId: z.uuid(),
  status: z.enum([TaskAssignmentStatus.Pending, TaskAssignmentStatus.Submitted]),
});

export const TaskReviewSchema = z.object({
  taskId: z.uuid(),
  decision: z.enum([ReviewDecision.Accepted, ReviewDecision.Rejected], {
    error: "Select accept or reject",
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

export const TaskCancelSchema = z.object({
  taskId: z.uuid(),
});
