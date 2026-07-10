import { auth } from "@/lib/auth";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  name: string;
}

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

export async function requireRole(...roles: string[]): Promise<AuthenticatedUser> {
  const user = await requireAuth();
  if (!roles.includes(user.role)) {
    throw new Error("Forbidden");
  }
  return user;
}
