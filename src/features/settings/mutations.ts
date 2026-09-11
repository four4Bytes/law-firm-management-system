import { prisma } from "@/lib/prisma";

import type { NotificationPreferences } from "./queries";

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
    },
  });

  return settings;
}
