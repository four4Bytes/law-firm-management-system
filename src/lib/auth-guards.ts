import { auth } from "@/lib/auth";

/** Minimal authenticated-user projection shared by the auth guards. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
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
    role: user.role,
    name: user.name,
  };
}

/**
 * Enforces the session and that the user holds one of the allowed roles.
 *
 * @param roles - Allowed role strings. The caller must hold at least one.
 * @returns The authenticated user when authorized.
 * @throws `"Unauthorized"` if no session, or `"Forbidden"` if the role is not allowed.
 */
export async function requireRole(...roles: string[]): Promise<AuthenticatedUser> {
  const user = await requireAuth();
  if (!roles.includes(user.role)) {
    throw new Error("Forbidden");
  }
  return user;
}
