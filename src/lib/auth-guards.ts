import { type Role } from "@/generated/prisma/browser";
import { auth } from "@/lib/auth";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { can, type AccessContext, type Permission } from "@/lib/rbac";

/** Minimal authenticated-user projection shared by the auth guards. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
  name: string;
}

/**
 * Enforces an authenticated session and returns the verified user.
 *
 * @returns The authenticated user projection.
 *
 * @throws {UnauthorizedError} when the session is missing any required field
 *         (`id`, `email`, `role`, `name`). Use at the top of Server Actions
 *         that need the current user regardless of role.
 */
export async function requireAuth(): Promise<AuthenticatedUser> {
  const session = await auth();
  const user = session?.user;

  if (!user?.id || !user.email || !user.role || !user.name) {
    throw new UnauthorizedError();
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role as Role,
    name: user.name,
  };
}

/**
 * Enforces the session and that the user holds at least one of the given
 * permissions, evaluated against the central RBAC matrix.
 *
 * Only context-free permissions (cells `yes`/`no`) are meaningful here.
 * Context-dependent permissions must be checked per record via `can(...)`
 * after loading the record's {@link AccessContext}.
 *
 * @param permissions - One or more granular permissions; the caller must be
 *                      granted at least one.
 * @returns The authenticated user when authorized.
 * @throws {UnauthorizedError} if no session.
 * @throws {ForbiddenError} if no permission is granted.
 */
export async function requirePermission(...permissions: Permission[]): Promise<AuthenticatedUser> {
  const user = await requireAuth();
  if (!permissions.some((permission) => can(user.role, permission))) {
    throw new ForbiddenError();
  }
  return user;
}

/**
 * Evaluates a record-scoped permission against an {@link AccessContext} and
 * throws `"Forbidden"` when denied. Call after loading the context for the
 * specific record (e.g. via `getCaseAccessContext`).
 *
 * @param session    - The authenticated user.
 * @param permission - The record-scoped permission to evaluate.
 * @param context    - The user's relation to the target record.
 * @returns The evaluated context, for callers that need it downstream.
 * @throws {ForbiddenError} when the permission is denied.
 */
export function assertRecordPermission(
  session: AuthenticatedUser,
  permission: Permission,
  context: AccessContext,
): AccessContext {
  if (!can(session.role, permission, context)) {
    throw new ForbiddenError();
  }
  return context;
}
