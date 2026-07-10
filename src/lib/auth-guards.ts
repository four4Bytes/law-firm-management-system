import { auth } from "@/lib/auth";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  name: string;
}

export async function requireAuth(): Promise<AuthenticatedUser> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return {
    id: session.user.id,
    email: session.user.email!,
    role: session.user.role!,
    name: session.user.name!,
  };
}

export async function requireRole(...roles: string[]): Promise<AuthenticatedUser> {
  const user = await requireAuth();
  if (!roles.includes(user.role)) {
    throw new Error("Forbidden");
  }
  return user;
}
