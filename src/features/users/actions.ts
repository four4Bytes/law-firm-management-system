"use server";

import { after } from "next/server";
import { z } from "zod";

import { createAuditLog } from "@/features/audit/mutations";
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
import { requireRole } from "@/lib/auth-guards";
import { isDeveloperEmail } from "@/lib/developer-emails";

import {
  CreateUserSchema,
  DeactivateUserSchema,
  UpdateUserSchema,
  UserPageQuerySchema,
} from "./schemas";

export async function getUsersPaginatedAction(
  params: z.input<typeof UserPageQuerySchema>,
): Promise<{
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
  try {
    await requireRole("Admin", "Dev");
  } catch {
    return false;
  }

  const parsed = CreateUserSchema.pick({ email: true }).safeParse({ email });
  if (!parsed.success) return false;

  return isDeveloperEmail(parsed.data.email);
}

export async function createUserAction(
  payload: z.input<typeof CreateUserSchema>,
): Promise<ActionStatusResponse> {
  let session: { id: string; role: string };
  try {
    session = await requireRole("Admin", "Dev");
  } catch {
    return { success: false, error: "You don't have permission to create users." };
  }

  const parsed = CreateUserSchema.safeParse(payload);
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

      after(() =>
        createAuditLog({
          actorUserId: session.id,
          action: "user.reactivated",
          entityType: "User",
          entityId: existing.id,
          details: `Reactivated user: ${parsed.data.email}`,
        }).catch(console.error),
      );
    } catch {
      return { success: false, error: "Failed to reactivate user." };
    }
    return { success: true };
  }

  let createdUser: { id: string };
  try {
    createdUser = await createUser(parsed.data.email, effectiveRole);

    after(() =>
      createAuditLog({
        actorUserId: session.id,
        action: "user.created",
        entityType: "User",
        entityId: createdUser.id,
        details: `Created user: ${parsed.data.email}`,
      }).catch(console.error),
    );
  } catch {
    return { success: false, error: "Failed to create user." };
  }
  return { success: true };
}

export async function updateUserAction(
  payload: z.input<typeof UpdateUserSchema>,
): Promise<ActionStatusResponse> {
  let session: { id: string; role: string };
  try {
    session = await requireRole("Admin", "Dev");
  } catch {
    return { success: false, error: "You don't have permission to edit users." };
  }

  const parsed = UpdateUserSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: "Invalid input" };
  }

  if (!(CREATABLE_ROLES as readonly string[]).includes(parsed.data.role)) {
    return { success: false, error: "Invalid role." };
  }

  const target = await getUserById(parsed.data.userId);
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
  if (existing && existing.id !== parsed.data.userId) {
    return { success: false, error: "A user with this email already exists." };
  }

  try {
    await updateUser(parsed.data.userId, { email: parsed.data.email, role: parsed.data.role });

    after(() =>
      createAuditLog({
        actorUserId: session.id,
        action: "user.updated",
        entityType: "User",
        entityId: parsed.data.userId,
        details: `Updated user: ${parsed.data.email}`,
      }).catch(console.error),
    );
  } catch {
    return { success: false, error: "Failed to update user." };
  }
  return { success: true };
}

export async function deactivateUserAction(
  payload: z.input<typeof DeactivateUserSchema>,
): Promise<ActionStatusResponse> {
  let session: { id: string; role: string };
  try {
    session = await requireRole("Admin", "Dev");
  } catch {
    return { success: false, error: "Only admins and developers can deactivate users." };
  }

  const parsed = DeactivateUserSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: "Invalid user ID" };
  }

  const target = await getUserById(parsed.data.userId);
  if (!target) {
    return { success: false, error: "User not found." };
  }
  if (target.role === Role.Admin || target.role === Role.Dev) {
    const remaining = await countActiveAdminsAndDevs(parsed.data.userId);
    if (remaining === 0) {
      return { success: false, error: "Cannot deactivate the last admin or developer." };
    }
  }
  try {
    await setUserActiveStatus(parsed.data.userId, false);

    after(() =>
      createAuditLog({
        actorUserId: session.id,
        action: "user.deactivated",
        entityType: "User",
        entityId: parsed.data.userId,
        details: "Deactivated user",
      }).catch(console.error),
    );
  } catch {
    return { success: false, error: "Failed to deactivate user." };
  }
  return { success: true };
}
