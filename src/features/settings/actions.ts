"use server";

import { revalidatePath } from "next/cache";

import { actionInvalid, type ActionStatusResponse } from "@/lib/security/action-response";
import { requireAuth } from "@/lib/security/auth-guards";
import { toActionResponse } from "@/lib/security/errors";

import { upsertDeadlineReminderPreferences, upsertNotificationPreferences } from "./mutations";
import {
  getDeadlineReminderPreferences,
  getNotificationPreferences,
  type NotificationPreferences,
} from "./queries";
import {
  UpdateDeadlineReminderScheduleSchema,
  UpdateNotificationPreferencesSchema,
} from "./schemas";

export async function getNotificationPreferencesAction(): Promise<NotificationPreferences> {
  const session = await requireAuth();
  return getNotificationPreferences(session.id);
}

export async function updateNotificationPreferencesAction(
  payload: unknown,
): Promise<ActionStatusResponse> {
  try {
    const session = await requireAuth();

    const parsed = UpdateNotificationPreferencesSchema.safeParse(payload);
    if (!parsed.success) {
      return actionInvalid("settings");
    }

    await upsertNotificationPreferences(session.id, parsed.data);

    revalidatePath("/settings");

    return { success: true };
  } catch (error) {
    return toActionResponse(error, "update notification preferences");
  }
}

export async function getDeadlineReminderPreferencesAction(): Promise<{
  consultation_reminder_days: number;
  consultation_reminder_frequency: "KeyDays" | "Daily";
  consultation_notify_overdue: boolean;
  milestone_reminder_days: number;
  milestone_reminder_frequency: "KeyDays" | "Daily";
  milestone_notify_overdue: boolean;
}> {
  const session = await requireAuth();
  return getDeadlineReminderPreferences(session.id);
}

export async function updateDeadlineReminderPreferencesAction(
  payload: unknown,
): Promise<ActionStatusResponse> {
  try {
    const session = await requireAuth();

    const parsed = UpdateDeadlineReminderScheduleSchema.safeParse(payload);
    if (!parsed.success) {
      return actionInvalid("settings");
    }

    await upsertDeadlineReminderPreferences(session.id, parsed.data);

    revalidatePath("/settings");

    return { success: true };
  } catch (error) {
    return toActionResponse(error, "update deadline reminder preferences");
  }
}
