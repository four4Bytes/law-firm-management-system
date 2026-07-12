import { z } from "zod";

import { TaskStatus } from "@/generated/prisma/client";

export const TaskIdSchema = z.object({
  taskId: z.uuid(),
});

export const TaskCreatePayloadSchema = z.object({
  title: z.string().trim().min(1).max(500),
  description: z.string().trim().min(1).max(10000).optional(),
  status: z.enum(TaskStatus).optional().default(TaskStatus.Pending),
  case_id: z.uuid(),
  assignee_ids: z.array(z.uuid()).optional(),
});

export const TaskUpdatePayloadSchema = z.object({
  taskId: z.uuid(),
  title: z.string().trim().min(1).max(500),
  description: z.string().trim().min(1).max(10000).optional(),
  status: z.enum(TaskStatus),
  assignee_ids: z.array(z.uuid()).optional(),
});
