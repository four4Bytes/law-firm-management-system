"use server";

import { CREATABLE_ROLES } from "@/features/users/constants";
import { createUser, setUserActiveStatus, updateUser } from "@/features/users/mutations";
import {
  countActiveAdminsAndDevs,
  getUserByEmail,
  getUserById,
  getUsersPaginated,
} from "@/features/users/queries";
import { Role } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { isDeveloperEmail } from "@/lib/developer-emails";

export async function getUsersPaginatedAction({
  search,
  cursor,
  pageSize,
}: {
  search?: string;
  cursor?: string;
  pageSize?: number;
}) {
  return getUsersPaginated({ search, cursor, pageSize });
}

const ALLOWED_ROLES = new Set(CREATABLE_ROLES);

export async function checkDeveloperEmail(email: string) {
  return isDeveloperEmail(email);
}

export async function createUserAction(email: string, role: string) {
  const session = await auth();
  if (session?.user?.role !== "Admin" && session?.user?.role !== Role.Dev) {
    return { error: "You don't have permission to create users." };
  }

  const isDevEmail = isDeveloperEmail(email);
  const effectiveRole = isDevEmail ? Role.Dev : (role as Role);

  if (!isDevEmail && !ALLOWED_ROLES.has(effectiveRole)) {
    return { error: "Invalid role." };
  }

  const existing = await getUserByEmail(email);
  if (existing) {
    if (existing.is_active) {
      return { error: "A user with this email already exists." };
    }
    try {
      await updateUser(existing.id, { role: effectiveRole, is_active: true });
    } catch {
      return { error: "Failed to reactivate user." };
    }
    return { error: null };
  }

  try {
    await createUser(email, effectiveRole);
  } catch {
    return { error: "Failed to create user." };
  }
  return { error: null };
}

export async function updateUserAction(id: string, email: string, role: string) {
  const session = await auth();
  if (session?.user?.role !== "Admin" && session?.user?.role !== Role.Dev) {
    return { error: "You don't have permission to edit users." };
  }

  if (!ALLOWED_ROLES.has(role as Role)) {
    return { error: "Invalid role." };
  }

  const target = await getUserById(id);
  if (!target) {
    return { error: "User not found." };
  }
  if (target.role === Role.Dev) {
    return { error: "Cannot edit developer accounts." };
  }
  if (session.user.role === Role.Dev && target.id === session.user.id) {
    return { error: "Cannot edit your own account." };
  }

  const existing = await getUserByEmail(email);
  if (existing && existing.id !== id) {
    return { error: "A user with this email already exists." };
  }

  try {
    await updateUser(id, { email, role: role as Role });
  } catch {
    return { error: "Failed to update user." };
  }
  return { error: null };
}

export async function deactivateUserAction(id: string) {
  const session = await auth();
  if (session?.user?.role !== "Admin" && session?.user?.role !== Role.Dev) {
    return { error: "Only admins and developers can deactivate users." };
  }

  const target = await getUserById(id);
  if (!target) {
    return { error: "User not found." };
  }
  if (target.role === Role.Admin || target.role === Role.Dev) {
    const remaining = await countActiveAdminsAndDevs(id);
    if (remaining === 0) {
      return { error: "Cannot deactivate the last admin or developer." };
    }
  }
  try {
    await setUserActiveStatus(id, false);
  } catch {
    return { error: "Failed to deactivate user." };
  }
  return { error: null };
}
