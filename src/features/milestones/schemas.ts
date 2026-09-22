import { z } from "zod";

import { CaseMilestoneStatus } from "@/generated/prisma/browser";
import { optionalText, requiredEnum, requiredText } from "@/lib/validation/form-utils";
import { PageQuerySchema } from "@/lib/validation/schemas";

export const MilestoneIdSchema = z.object({
  milestoneId: z.uuid(),
});

export const MilestoneListQuerySchema = PageQuerySchema.extend({
  caseId: z.uuid(),
  filters: z
    .object({
      status: z.array(z.enum(CaseMilestoneStatus)).max(10).optional(),
    })
    .optional(),
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
