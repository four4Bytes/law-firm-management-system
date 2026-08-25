"use server";

import { after } from "next/server";
import { z } from "zod";

import { logAudit } from "@/features/audit/mutations";
import { CREATABLE_ROLES } from "@/features/users/constants";
import { createUser, setUserActiveStatus, updateUser } from "@/features/users/mutations";
import {
  countActiveAdminsAndDevs,
  getUserByEmail,
  getUserById,
  getUsersPaginated,
  type UserRow,
} from "@/features/users/queries";
import { Role } from "@/generated/prisma/browser";
import {
  actionConflict,
  actionInvalid,
  actionNotFound,
  type ActionDataResponse,
  type ActionStatusResponse,
} from "@/lib/action-response";
import { requirePermission } from "@/lib/auth-guards";
import { isDeveloperEmail } from "@/lib/developer-emails";
import { toActionResponse } from "@/lib/errors";

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
  await requirePermission("user.read");

  const parsed = UserPageQuerySchema.safeParse(params);
  if (!parsed.success) {
    throw new Error("Invalid query parameters");
  }

  return getUsersPaginated(parsed.data);
}

export async function checkDeveloperEmail(email: string): Promise<boolean> {
  try {
    await requirePermission("user.create");
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
  try {
    const session = await requirePermission("user.create");

    const parsed = CreateUserSchema.safeParse(payload);
    if (!parsed.success) {
      return actionInvalid("user");
    }

    const isDevEmail = isDeveloperEmail(parsed.data.email);
    const effectiveRole = isDevEmail ? Role.Dev : parsed.data.role;

    if (!isDevEmail && !(CREATABLE_ROLES as readonly string[]).includes(effectiveRole)) {
      return actionConflict("Invalid role", "The selected role is not valid.");
    }

    const existing = await getUserByEmail(parsed.data.email);
    if (existing) {
      if (existing.is_active) {
        return actionConflict("Email already in use", "A user with this email already exists.");
      }

      await updateUser(existing.id, { role: effectiveRole, is_active: true });

      after(() =>
        logAudit({
          actorUserId: session.id,
          action: "user.reactivated",
          entityType: "User",
          entityId: existing.id,
          details: `Reactivated user: ${parsed.data.email}`,
        }),
      );
      return { success: true };
    }

    const createdUser = await createUser(parsed.data.email, effectiveRole);

    after(() =>
      logAudit({
        actorUserId: session.id,
        action: "user.created",
        entityType: "User",
        entityId: createdUser.id,
        details: `Created user: ${parsed.data.email}`,
      }),
    );
    return { success: true };
  } catch (error) {
    return toActionResponse(error, "create user", {
      title: "Email already in use",
      description: "A user with this email already exists.",
    });
  }
}

export async function updateUserAction(
  payload: z.input<typeof UpdateUserSchema>,
): Promise<ActionStatusResponse> {
  try {
    const session = await requirePermission("user.update");

    const parsed = UpdateUserSchema.safeParse(payload);
    if (!parsed.success) {
      return actionInvalid("user");
    }

    if (!(CREATABLE_ROLES as readonly string[]).includes(parsed.data.role)) {
      return actionConflict("Invalid role", "The selected role is not valid.");
    }

    const target = await getUserById(parsed.data.userId);
    if (!target) {
      return actionNotFound("User");
    }
    if (target.role === Role.Dev) {
      return actionConflict("Developer account", "Developer accounts cannot be edited.");
    }
    if (session.role === Role.Dev && target.id === session.id) {
      return actionConflict("Own account", "You cannot edit your own account.");
    }

    const existing = await getUserByEmail(parsed.data.email);
    if (existing && existing.id !== parsed.data.userId) {
      return actionConflict("Email already in use", "A user with this email already exists.");
    }

    await updateUser(parsed.data.userId, { email: parsed.data.email, role: parsed.data.role });

    after(() =>
      logAudit({
        actorUserId: session.id,
        action: "user.updated",
        entityType: "User",
        entityId: parsed.data.userId,
        details: `Updated user: ${parsed.data.email}`,
      }),
    );
    return { success: true };
  } catch (error) {
    return toActionResponse(error, "update user", {
      title: "Email already in use",
      description: "A user with this email already exists.",
    });
  }
}

export async function deactivateUserAction(
  payload: z.input<typeof DeactivateUserSchema>,
): Promise<ActionDataResponse<{ selfDeactivated: boolean }>> {
  try {
    const session = await requirePermission("user.delete");

    const parsed = DeactivateUserSchema.safeParse(payload);
    if (!parsed.success) {
      return actionInvalid("user");
    }

    const target = await getUserById(parsed.data.userId);
    if (!target) {
      return actionNotFound("User");
    }
    if (target.role === Role.Admin || target.role === Role.Dev) {
      const remaining = await countActiveAdminsAndDevs(parsed.data.userId);
      if (remaining === 0) {
        return actionConflict("Last admin", "Cannot deactivate the last admin or developer.");
      }
    }

    await setUserActiveStatus(parsed.data.userId, false);

    after(() =>
      logAudit({
        actorUserId: session.id,
        action: "user.deactivated",
        entityType: "User",
        entityId: parsed.data.userId,
        details: "Deactivated user",
      }),
    );
    return { success: true, data: { selfDeactivated: parsed.data.userId === session.id } };
  } catch (error) {
    return toActionResponse(error, "deactivate user");
  }
}
