import { cache } from "react";

import type { UserSettings } from "@/generated/prisma/browser";
import { prisma } from "@/lib/prisma";

export type NotificationPreferences = Pick<
  UserSettings,
  | "notify_email_case_assigned"
  | "notify_email_consultation_assigned"
  | "notify_email_task_assigned"
  | "notify_email_case_status_changed"
  | "notify_email_consultation_status_changed"
  | "notify_email_task_status_changed"
  | "notify_email_milestone_status_changed"
>;

export type DeadlineReminderPreferences = Pick<
  UserSettings,
  | "consultation_reminder_days"
  | "consultation_reminder_frequency"
  | "consultation_notify_overdue"
  | "milestone_reminder_days"
  | "milestone_reminder_frequency"
  | "milestone_notify_overdue"
>;

const DEFAULT_PREFERENCES: NotificationPreferences = {
  notify_email_case_assigned: true,
  notify_email_consultation_assigned: true,
  notify_email_task_assigned: true,
  notify_email_case_status_changed: true,
  notify_email_consultation_status_changed: true,
  notify_email_task_status_changed: true,
  notify_email_milestone_status_changed: true,
};

const DEFAULT_DEADLINE_PREFERENCES: DeadlineReminderPreferences = {
  consultation_reminder_days: 3,
  consultation_reminder_frequency: "KeyDays",
  consultation_notify_overdue: true,
  milestone_reminder_days: 5,
  milestone_reminder_frequency: "KeyDays",
  milestone_notify_overdue: true,
};

export const getNotificationPreferences = cache(
  async (userId: string): Promise<NotificationPreferences> => {
    const settings = await prisma.userSettings.findUnique({
      where: { user_id: userId },
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
      notify_email_case_status_changed: true,
      notify_email_consultation_status_changed: true,
      notify_email_task_status_changed: true,
      notify_email_milestone_status_changed: true,
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
      notify_email_case_status_changed: row.notify_email_case_status_changed,
      notify_email_consultation_status_changed: row.notify_email_consultation_status_changed,
      notify_email_task_status_changed: row.notify_email_task_status_changed,
      notify_email_milestone_status_changed: row.notify_email_milestone_status_changed,
    });
  }

  return map;
}

export const getDeadlineReminderPreferences = cache(
  async (userId: string): Promise<DeadlineReminderPreferences> => {
    const settings = await prisma.userSettings.findUnique({
      where: { user_id: userId },
      select: {
        consultation_reminder_days: true,
        consultation_reminder_frequency: true,
        consultation_notify_overdue: true,
        milestone_reminder_days: true,
        milestone_reminder_frequency: true,
        milestone_notify_overdue: true,
      },
    });

    return settings
      ? {
          consultation_reminder_days: settings.consultation_reminder_days,
          consultation_reminder_frequency: settings.consultation_reminder_frequency,
          consultation_notify_overdue: settings.consultation_notify_overdue,
          milestone_reminder_days: settings.milestone_reminder_days,
          milestone_reminder_frequency: settings.milestone_reminder_frequency,
          milestone_notify_overdue: settings.milestone_notify_overdue,
        }
      : DEFAULT_DEADLINE_PREFERENCES;
  },
);

export async function getDeadlineReminderPreferencesByUserIds(
  userIds: string[],
): Promise<Map<string, DeadlineReminderPreferences>> {
  if (userIds.length === 0) return new Map();

  const rows = await prisma.userSettings.findMany({
    where: { user_id: { in: userIds } },
    select: {
      user_id: true,
      consultation_reminder_days: true,
      consultation_reminder_frequency: true,
      consultation_notify_overdue: true,
      milestone_reminder_days: true,
      milestone_reminder_frequency: true,
      milestone_notify_overdue: true,
    },
  });

  const map = new Map<string, DeadlineReminderPreferences>();
  for (const id of userIds) {
    map.set(id, DEFAULT_DEADLINE_PREFERENCES);
  }
  for (const row of rows) {
    map.set(row.user_id, {
      consultation_reminder_days: row.consultation_reminder_days,
      consultation_reminder_frequency: row.consultation_reminder_frequency,
      consultation_notify_overdue: row.consultation_notify_overdue,
      milestone_reminder_days: row.milestone_reminder_days,
      milestone_reminder_frequency: row.milestone_reminder_frequency,
      milestone_notify_overdue: row.milestone_notify_overdue,
    });
  }

  return map;
}
