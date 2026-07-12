"use server";

import { CREATABLE_ROLES } from "@/features/users/constants";
import { createUser, setUserActiveStatus, updateUser } from "@/features/users/mutations";
import {
  countActiveAdminsAndDevs,
  getUserByEmail,
  getUserById,
  getUsersPaginated,
  type UserRow,
} from "@/features/users/queries";
import { Role } from "@/generated/prisma/client";
import type { ActionStatusResponse } from "@/lib/action-response";
import { requireAuth, requireRole } from "@/lib/auth-guards";
import { isDeveloperEmail } from "@/lib/developer-emails";

import {
  CreateUserSchema,
  DeactivateUserSchema,
  UpdateUserSchema,
  UserPageQuerySchema,
} from "./schemas";

export async function getUsersPaginatedAction(params: unknown): Promise<{
  users: UserRow[];
  nextCursor: string | null;
}> {
  await requireRole("Admin", "Dev");

  const parsed = UserPageQuerySchema.safeParse(params);
  if (!parsed.success) {
    throw new Error("Invalid query parameters");
  }

  return getUsersPaginated(parsed.data);
}

export async function checkDeveloperEmail(email: string): Promise<boolean> {
  await requireAuth();
  return isDeveloperEmail(email);
}

export async function createUserAction(email: string, role: string): Promise<ActionStatusResponse> {
  try {
    await requireRole("Admin", "Dev");
  } catch {
    return { success: false, error: "You don't have permission to create users." };
  }

  const parsed = CreateUserSchema.safeParse({ email, role });
  if (!parsed.success) {
    return { success: false, error: "Invalid email or role" };
  }

  const isDevEmail = isDeveloperEmail(parsed.data.email);
  const effectiveRole = isDevEmail ? Role.Dev : parsed.data.role;

  if (!isDevEmail && !(CREATABLE_ROLES as readonly string[]).includes(effectiveRole)) {
    return { success: false, error: "Invalid role." };
  }

  const existing = await getUserByEmail(parsed.data.email);
  if (existing) {
    if (existing.is_active) {
      return { success: false, error: "A user with this email already exists." };
    }
    try {
      await updateUser(existing.id, { role: effectiveRole, is_active: true });
    } catch {
      return { success: false, error: "Failed to reactivate user." };
    }
    return { success: true };
  }

  try {
    await createUser(parsed.data.email, effectiveRole);
  } catch {
    return { success: false, error: "Failed to create user." };
  }
  return { success: true };
}

export async function updateUserAction(
  id: string,
  email: string,
  role: string,
): Promise<ActionStatusResponse> {
  let session: { id: string; role: string };
  try {
    session = await requireRole("Admin", "Dev");
  } catch {
    return { success: false, error: "You don't have permission to edit users." };
  }

  const parsed = UpdateUserSchema.safeParse({ id, email, role });
  if (!parsed.success) {
    return { success: false, error: "Invalid input" };
  }

  if (!(CREATABLE_ROLES as readonly string[]).includes(parsed.data.role)) {
    return { success: false, error: "Invalid role." };
  }

  const target = await getUserById(parsed.data.id);
  if (!target) {
    return { success: false, error: "User not found." };
  }
  if (target.role === Role.Dev) {
    return { success: false, error: "Cannot edit developer accounts." };
  }
  if (session.role === Role.Dev && target.id === session.id) {
    return { success: false, error: "Cannot edit your own account." };
  }

  const existing = await getUserByEmail(parsed.data.email);
  if (existing && existing.id !== parsed.data.id) {
    return { success: false, error: "A user with this email already exists." };
  }

  try {
    await updateUser(parsed.data.id, { email: parsed.data.email, role: parsed.data.role });
  } catch {
    return { success: false, error: "Failed to update user." };
  }
  return { success: true };
}

export async function deactivateUserAction(id: string): Promise<ActionStatusResponse> {
  try {
    await requireRole("Admin", "Dev");
  } catch {
    return { success: false, error: "Only admins and developers can deactivate users." };
  }

  const parsed = DeactivateUserSchema.safeParse({ id });
  if (!parsed.success) {
    return { success: false, error: "Invalid user ID" };
  }

  const target = await getUserById(parsed.data.id);
  if (!target) {
    return { success: false, error: "User not found." };
  }
  if (target.role === Role.Admin || target.role === Role.Dev) {
    const remaining = await countActiveAdminsAndDevs(parsed.data.id);
    if (remaining === 0) {
      return { success: false, error: "Cannot deactivate the last admin or developer." };
    }
  }
  try {
    await setUserActiveStatus(parsed.data.id, false);
  } catch {
    return { success: false, error: "Failed to deactivate user." };
  }
  return { success: true };
}
