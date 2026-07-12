import { z } from "zod";

import { CaseMilestoneStatus } from "@/generated/prisma/browser";

export const MilestoneIdSchema = z.object({
  milestoneId: z.uuid(),
});

export const MilestoneCreatePayloadSchema = z.object({
  title: z.string().trim().min(1).max(500),
  description: z.string().trim().min(1).max(10000).optional(),
  due_date: z.coerce.date(),
  status: z.enum(CaseMilestoneStatus).optional().default(CaseMilestoneStatus.Pending),
  case_id: z.uuid(),
});

export const MilestoneUpdatePayloadSchema = z.object({
  milestoneId: z.uuid(),
  title: z.string().trim().min(1).max(500),
  description: z.string().trim().min(1).max(10000).optional(),
  due_date: z.coerce.date(),
  status: z.enum(CaseMilestoneStatus),
});
