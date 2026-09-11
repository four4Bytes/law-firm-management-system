import { prisma } from "@/lib/prisma";

import type { DeadlineReminderPreferences, NotificationPreferences } from "./queries";

export async function upsertNotificationPreferences(
  userId: string,
  data: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> {
  const settings = await prisma.userSettings.upsert({
    where: { user_id: userId },
    update: data,
    create: {
      user_id: userId,
      ...data,
    },
    select: {
      notify_email_case_assigned: true,
      notify_email_consultation_assigned: true,
      notify_email_task_assigned: true,
      notify_email_case_status_changed: true,
      notify_email_consultation_status_changed: true,
      notify_email_task_status_changed: true,
      notify_email_milestone_status_changed: true,
    },
  });

  return settings;
}

export async function upsertDeadlineReminderPreferences(
  userId: string,
  data: Partial<DeadlineReminderPreferences>,
): Promise<DeadlineReminderPreferences> {
  const settings = await prisma.userSettings.upsert({
    where: { user_id: userId },
    update: data,
    create: {
      user_id: userId,
      ...data,
    },
    select: {
      consultation_reminder_days: true,
      consultation_reminder_frequency: true,
      consultation_notify_overdue: true,
      milestone_reminder_days: true,
      milestone_reminder_frequency: true,
      milestone_notify_overdue: true,
    },
  });

  return settings;
}
