import { cache } from "react";

import type { UserSettings } from "@/generated/prisma/browser";
import { prisma } from "@/lib/prisma";

export type NotificationPreferences = Pick<
  UserSettings,
  "notify_email_case_assigned" | "notify_email_consultation_assigned" | "notify_email_task_assigned"
>;

const DEFAULT_PREFERENCES: NotificationPreferences = {
  notify_email_case_assigned: true,
  notify_email_consultation_assigned: true,
  notify_email_task_assigned: true,
};

export const getNotificationPreferences = cache(
  async (userId: string): Promise<NotificationPreferences> => {
    const settings = await prisma.userSettings.findUnique({
      where: { user_id: userId },
      select: {
        notify_email_case_assigned: true,
        notify_email_consultation_assigned: true,
        notify_email_task_assigned: true,
      },
    });

    return settings ?? DEFAULT_PREFERENCES;
  },
);

export async function getNotificationPreferencesByUserIds(
  userIds: string[],
): Promise<Map<string, NotificationPreferences>> {
  if (userIds.length === 0) return new Map();

  const rows = await prisma.userSettings.findMany({
    where: { user_id: { in: userIds } },
    select: {
      user_id: true,
      notify_email_case_assigned: true,
      notify_email_consultation_assigned: true,
      notify_email_task_assigned: true,
    },
  });

  const map = new Map<string, NotificationPreferences>();
  for (const id of userIds) {
    map.set(id, DEFAULT_PREFERENCES);
  }
  for (const row of rows) {
    map.set(row.user_id, {
      notify_email_case_assigned: row.notify_email_case_assigned,
      notify_email_consultation_assigned: row.notify_email_consultation_assigned,
      notify_email_task_assigned: row.notify_email_task_assigned,
    });
  }

  return map;
}
