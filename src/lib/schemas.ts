import { z } from "zod";

export const SortQuerySchema = z.object({
  column: z.string().trim().min(1).max(100),
  direction: z.enum(["asc", "desc"]),
});

export const PageQuerySchema = z.object({
  search: z.string().trim().max(500).optional().default(""),
  cursor: z.uuid().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  sort: SortQuerySchema.optional(),
});

export const LimitSchema = z.coerce.number().int().min(1).max(100).optional();

export const ClientDataSchema = z.object({
  name: z.string().trim().min(1).max(255),
  email: z.email().trim().min(1).max(255).optional(),
  phone_number: z.string().trim().min(1).max(50).optional(),
  address: z.string().trim().min(1).max(500).optional(),
});

export function exactlyOneParentRefinement({
  case_id,
  consultation_id,
}: {
  case_id?: string | null;
  consultation_id?: string | null;
}): boolean {
  return Boolean(case_id) !== Boolean(consultation_id);
}
