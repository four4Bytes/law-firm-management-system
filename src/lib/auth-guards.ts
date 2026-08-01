import { type Role } from "@/generated/prisma/browser";
import { auth } from "@/lib/auth";
import { can, type Permission } from "@/lib/rbac";

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
 * Throws `"Unauthorized"` when the session is missing any required field
 * (`id`, `email`, `role`, `name`). Use at the top of Server Actions that need
 * the current user regardless of role.
 */
export async function requireAuth(): Promise<AuthenticatedUser> {
  const session = await auth();
  const user = session?.user;

  if (!user?.id || !user.email || !user.role || !user.name) {
    throw new Error("Unauthorized");
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
 * @throws `"Unauthorized"` if no session, or `"Forbidden"` if no permission
 *         is granted.
 */
export async function requirePermission(...permissions: Permission[]): Promise<AuthenticatedUser> {
  const user = await requireAuth();
  if (!permissions.some((permission) => can(user.role, permission))) {
    throw new Error("Forbidden");
  }
  return user;
}
