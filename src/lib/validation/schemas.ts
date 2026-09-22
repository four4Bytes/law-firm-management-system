import { z } from "zod";

/** Reusable Zod schemas for pagination, sorting, and bounded limits. */

/** Sort descriptor for a single column (used by paginated queries). */
export const SortQuerySchema = z.object({
  column: z.string().trim().min(1).max(100),
  direction: z.enum(["asc", "desc"]),
});

/** Query parameters shared by paginated list Server Actions. */
export const PageQuerySchema = z.object({
  search: z.string().trim().max(500).optional().default(""),
  cursor: z.uuid().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  sort: SortQuerySchema.optional(),
});

/** Optional integer limit (1–100) used by bounded list queries. */
export const LimitSchema = z.coerce.number().int().min(1).max(100).optional();

/**
 * Asserts that exactly one of the given keys holds a set value.
 *
 * @typeParam T - The parsed payload object type.
 * @param payload - The parsed payload to inspect.
 * @param keys - The mutually exclusive keys; exactly one must be truthy.
 * @returns True when exactly one listed key is set, false otherwise.
 */
export function exactlyOneOf<T extends object>(payload: T, keys: readonly (keyof T)[]): boolean {
  return keys.filter((key) => !!payload[key]).length === 1;
}
