"use server";

import { revalidatePath } from "next/cache";

import { actionInvalid, type ActionStatusResponse } from "@/lib/action-response";
import { requireAuth } from "@/lib/auth-guards";
import { toActionResponse } from "@/lib/errors";

import { upsertNotificationPreferences } from "./mutations";
import { getNotificationPreferences } from "./queries";
import { UpdateNotificationPreferencesSchema } from "./schemas";

export async function getNotificationPreferencesAction(): Promise<{
  notify_email_case_assigned: boolean;
  notify_email_consultation_assigned: boolean;
  notify_email_task_assigned: boolean;
}> {
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
