import { getUserNameById, getUsersByIds } from "@/features/users/queries";
import { NotificationType } from "@/generated/prisma/browser";
import { sendEmail } from "@/lib/email";
import {
  caseAssignedTemplate,
  consultationCreatedTemplate,
  consultationReminderTemplate,
  consultationUpdatedTemplate,
  milestoneTemplate,
  taskAssignedTemplate,
  taskUpdatedTemplate,
} from "@/lib/email-templates";

import { createNotifications } from "@/features/notifications/mutations";
import type { NotificationDispatchPayload } from "@/features/notifications/schemas";

function pickTemplate(type: NotificationType) {
  switch (type) {
    case NotificationType.ConsultationCreated:
      return consultationCreatedTemplate;
    case NotificationType.ConsultationReminder:
      return consultationReminderTemplate;
    case NotificationType.ConsultationUpdated:
      return consultationUpdatedTemplate;
    case NotificationType.MilestoneDueSoon:
    case NotificationType.MilestoneCompleted:
    case NotificationType.MilestoneStatusChanged:
    case NotificationType.MilestoneOverdue:
      return milestoneTemplate;
    case NotificationType.TaskAssigned:
      return taskAssignedTemplate;
    case NotificationType.TaskStatusChanged:
      return taskUpdatedTemplate;
    case NotificationType.CaseAssigned:
      return caseAssignedTemplate;
    default:
      return null;
  }
}

export async function dispatchNotifications(
  payload: NotificationDispatchPayload,
  actorUserId: string,
): Promise<{ count: number }> {
  const result = await createNotifications(payload);

  let actorName = "System";
  let recipients: Awaited<ReturnType<typeof getUsersByIds>> = [];

  try {
    actorName = (await getUserNameById({ id: actorUserId })) ?? "System";
  } catch (err) {
    console.error("Failed to resolve actor name:", err);
  }

  try {
    recipients = await getUsersByIds({ ids: payload.userIds });
  } catch (err) {
    console.error("Failed to resolve recipients:", err);
  }

  const template = pickTemplate(payload.type);

  if (template) {
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
  }

  return result;
}
