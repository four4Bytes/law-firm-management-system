import { logError } from "@/lib/logger";

import { dispatchNotifications } from "./dispatch";
import type { NotificationDispatchPayload } from "./schemas";

export async function notifyRecipients(
  actorUserId: string,
  payload: NotificationDispatchPayload,
  label?: string,
): Promise<void> {
  if (payload.userIds.length === 0) return;
  try {
    await dispatchNotifications(payload, actorUserId);
  } catch (err) {
    logError(`notifications.dispatch.${label ?? "default"}`, err);
  }
}
