// Mirrors documentation/notifications.md — the dispatch/recipient/email pipeline is the spec.
// Change the doc and this implementation together.

import { createNotifications } from "@/features/notifications/mutations";
import type { NotificationDispatchPayload } from "@/features/notifications/schemas";
import { getActiveUserIds, getUserNameById, getUsersByIds } from "@/features/users/queries";
import { NotificationType } from "@/generated/prisma/browser";
import { sendEmail } from "@/lib/email";
import {
  caseAssignedTemplate,
  consultationAssignedTemplate,
  consultationOverdueTemplate,
  consultationReminderTemplate,
  milestoneTemplate,
  statusChangeTemplate,
  taskAssignedTemplate,
} from "@/lib/email-templates";

/** Compile-time exhaustiveness guard — `value` must be `never` at this point. */
function assertNever(value: never): never {
  throw new Error(`Unhandled notification type: ${String(value)}`);
}

function pickTemplate(type: NotificationType) {
  switch (type) {
    case NotificationType.ConsultationReminder:
      return consultationReminderTemplate;
    case NotificationType.ConsultationOverdue:
      return consultationOverdueTemplate;
    case NotificationType.MilestoneDueSoon:
    case NotificationType.MilestoneOverdue:
      return milestoneTemplate;
    case NotificationType.TaskAssigned:
      return taskAssignedTemplate;
    case NotificationType.CaseAssigned:
      return caseAssignedTemplate;
    case NotificationType.MilestoneStatusChanged:
    case NotificationType.TaskStatusChanged:
    case NotificationType.CaseStatusChanged:
    case NotificationType.ConsultationStatusChanged:
      return statusChangeTemplate;
    case NotificationType.ConsultationAssigned:
      return consultationAssignedTemplate;
    default:
      return assertNever(type);
  }
}

export async function dispatchNotifications(
  payload: NotificationDispatchPayload,
  actorUserId: string,
  notifyActor: boolean = false,
): Promise<{ count: number }> {
  const actorFilteredIds = notifyActor
    ? [...payload.userIds]
    : payload.userIds.filter((id) => id !== actorUserId);

  if (actorFilteredIds.length === 0) return { count: 0 };

  const activeIds = await getActiveUserIds({ ids: actorFilteredIds });
  const userIds = [...new Set(activeIds)];
  if (userIds.length === 0) return { count: 0 };

  const filteredPayload = { ...payload, userIds };
  const result = await createNotifications(filteredPayload);

  let actorName = "System";
  let recipients: Awaited<ReturnType<typeof getUsersByIds>> = [];

  try {
    actorName = (await getUserNameById({ id: actorUserId })) ?? "System";
  } catch (err) {
    console.error("Failed to resolve actor name:", err);
  }

  try {
    recipients = await getUsersByIds({ ids: filteredPayload.userIds });
  } catch (err) {
    console.error("Failed to resolve recipients:", err);
  }

  const template = pickTemplate(payload.type);

  for (const user of recipients) {
    try {
      if (!user.email) continue;

      const html = template({
        toName: user.name ?? user.email,
        actorName,
        title: payload.title,
        message: payload.message,
        actionUrl: payload.actionUrl,
      });

      await sendEmail({ to: user.email, subject: payload.title, html });
    } catch (err) {
      console.error(`Failed to send email notification to user ${user.id}:`, err);
    }
  }

  return result;
}
