"use server";

import { z } from "zod";

import type { ActionStatusResponse } from "@/lib/action-response";
import { requireAuth } from "@/lib/auth-guards";
import { PageQuerySchema } from "@/lib/schemas";

import { markAllNotificationsRead, markNotificationRead } from "./mutations";
import {
  getNotificationsPaginated,
  getUnreadNotificationCount,
  getUnreadNotifications,
  type NotificationRow,
} from "./queries";
import { NotificationMarkReadSchema, UnreadNotificationsSchema } from "./schemas";

export async function getNotificationsPaginatedAction(
  params: z.input<typeof PageQuerySchema>,
): Promise<{
  rows: NotificationRow[];
  nextCursor: string | null;
}> {
  const session = await requireAuth();

  const parsed = PageQuerySchema.safeParse(params);
  if (!parsed.success) {
    throw new Error("Invalid query parameters");
  }

  return getNotificationsPaginated(session.id, parsed.data);
}

export async function getUnreadNotificationCountAction(): Promise<number> {
  const session = await requireAuth();
  return getUnreadNotificationCount(session.id);
}

export async function getUnreadNotificationsAction(
  params: z.input<typeof UnreadNotificationsSchema> = {},
): Promise<NotificationRow[]> {
  const session = await requireAuth();

  const parsed = UnreadNotificationsSchema.safeParse(params);
  if (!parsed.success) {
    throw new Error("Invalid parameters");
  }

  return getUnreadNotifications(session.id, parsed.data.limit);
}

export async function markNotificationReadAction(
  payload: z.input<typeof NotificationMarkReadSchema>,
): Promise<ActionStatusResponse> {
  const session = await requireAuth();

  const parsed = NotificationMarkReadSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: "Invalid notification ID" };
  }

  try {
    await markNotificationRead(parsed.data.notificationId, session.id);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to mark notification as read" };
  }
}

export async function markAllNotificationsReadAction(): Promise<ActionStatusResponse> {
  const session = await requireAuth();

  try {
    await markAllNotificationsRead(session.id);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to mark notifications as read" };
  }
}
