import { z } from "zod";

import { CaseMilestoneStatus } from "@/generated/prisma/browser";
import { optionalText, requiredEnum, requiredText } from "@/lib/form-utils";

export const MilestoneIdSchema = z.object({
  milestoneId: z.uuid(),
});

export const MilestoneCreatePayloadSchema = z.object({
  title: requiredText(500, "Title"),
  description: optionalText(10000, "Description"),
  due_date: z.coerce.date(),
  status: requiredEnum(CaseMilestoneStatus, "Status")
    .optional()
    .default(CaseMilestoneStatus.Pending),
  case_id: z.uuid(),
});

export const MilestoneUpdatePayloadSchema = z.object({
  milestoneId: z.uuid(),
  title: requiredText(500, "Title"),
  description: optionalText(10000, "Description"),
  due_date: z.coerce.date(),
  status: requiredEnum(CaseMilestoneStatus, "Status"),
});
