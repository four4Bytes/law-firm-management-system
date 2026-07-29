import { type Role } from "@/generated/prisma/browser";

/**
 * Client-side role-checking utilities for UI presentation.
 *
 * These are pure synchronous functions — they return booleans, never throw.
 * They must never be used as a security boundary. All enforcement must happen
 * server-side via {@link requireAuth} / {@link requireRole} in `auth-guards.ts`.
 */

/**
 * Checks whether a user's role is among the allowed set.
 *
 * @param userRole - The user's role (nullable, as it comes from the session).
 * @param roles    - One or more allowed {@link Role} values.
 * @returns `true` when `userRole` matches any of the given roles.
 */
export function hasRole(userRole: Role | null | undefined, ...roles: Role[]): boolean {
  if (!userRole) return false;
  return roles.includes(userRole);
}
