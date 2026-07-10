import { z } from "zod";

import { SortQuerySchema } from "@/lib/schemas";

export const CasePageQuerySchema = z.object({
  caseId: z.uuid(),
  search: z.string().trim().max(500).optional().default(""),
  cursor: z.uuid().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  sort: SortQuerySchema.optional(),
});

export const CaseOverviewIdSchema = z.object({
  id: z.uuid(),
});
