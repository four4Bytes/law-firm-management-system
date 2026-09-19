import { ReminderFrequency, type UserSettings } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type SettingsOverride = Partial<
  Pick<
    UserSettings,
    | "notify_email_case_assigned"
    | "notify_email_consultation_assigned"
    | "notify_email_task_assigned"
    | "notify_email_case_status_changed"
    | "notify_email_consultation_status_changed"
    | "notify_email_consultation_rescheduled"
    | "notify_email_task_status_changed"
    | "notify_email_milestone_status_changed"
    | "notify_email_milestone_rescheduled"
    | "consultation_reminder_days"
    | "consultation_reminder_frequency"
    | "consultation_notify_overdue"
    | "milestone_reminder_days"
    | "milestone_reminder_frequency"
    | "milestone_notify_overdue"
  >
>;

const allEmailOff: SettingsOverride = {
  notify_email_case_assigned: false,
  notify_email_consultation_assigned: false,
  notify_email_task_assigned: false,
  notify_email_case_status_changed: false,
  notify_email_consultation_status_changed: false,
  notify_email_consultation_rescheduled: false,
  notify_email_task_status_changed: false,
  notify_email_milestone_status_changed: false,
  notify_email_milestone_rescheduled: false,
};

const overrides: Record<string, SettingsOverride> = {
  "maya.fernandez@aninolaw.com": {
    ...allEmailOff,
    consultation_notify_overdue: false,
    milestone_notify_overdue: false,
  },
  "paolo.guerrero@aninolaw.com": {
    notify_email_task_assigned: false,
    notify_email_task_status_changed: false,
    milestone_reminder_days: 2,
    milestone_reminder_frequency: ReminderFrequency.Daily,
  },
  "jessica.lim@aninolaw.com": {
    consultation_reminder_days: 1,
  },
  "benito.cruz@aninolaw.com": {
    consultation_reminder_frequency: ReminderFrequency.Daily,
    milestone_reminder_frequency: ReminderFrequency.Daily,
  },
};

export async function seedUserSettings(userByEmail: Record<string, string>): Promise<void> {
  let customized = 0;
  for (const [email, userId] of Object.entries(userByEmail)) {
    await prisma.userSettings.create({
      data: {
        user_id: userId,
        ...(overrides[email] ?? {}),
      },
    });
    if (overrides[email]) customized++;
  }

  console.log(
    `Seeded user settings for ${Object.keys(userByEmail).length} users (${customized} customized).`,
  );
}
