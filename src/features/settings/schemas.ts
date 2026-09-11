import { z } from "zod";

import { ReminderFrequency } from "@/generated/prisma/browser";
import { nonNegativeInteger, requiredEnum } from "@/lib/form-utils";

export const NotificationPreferencesSchema = z.object({
  notify_email_case_assigned: z.boolean(),
  notify_email_consultation_assigned: z.boolean(),
  notify_email_task_assigned: z.boolean(),
});

export type NotificationPreferencesPayload = z.infer<typeof NotificationPreferencesSchema>;

export const UpdateNotificationPreferencesSchema = NotificationPreferencesSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one preference must be provided" },
);

export type UpdateNotificationPreferencesPayload = z.infer<
  typeof UpdateNotificationPreferencesSchema
>;

export const DeadlineReminderScheduleSchema = z.object({
  consultation_reminder_days: nonNegativeInteger("Consultation reminder days").max(
    30,
    "Consultation reminder days must be at most 30",
  ),
  consultation_reminder_frequency: requiredEnum(ReminderFrequency, "Consultation frequency"),
  consultation_notify_overdue: z.boolean(),
  milestone_reminder_days: nonNegativeInteger("Milestone reminder days").max(
    30,
    "Milestone reminder days must be at most 30",
  ),
  milestone_reminder_frequency: requiredEnum(ReminderFrequency, "Milestone frequency"),
  milestone_notify_overdue: z.boolean(),
});

export type DeadlineReminderSchedulePayload = z.infer<typeof DeadlineReminderScheduleSchema>;

export const UpdateDeadlineReminderScheduleSchema = DeadlineReminderScheduleSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one preference must be provided" },
);

export type UpdateDeadlineReminderSchedulePayload = z.infer<
  typeof UpdateDeadlineReminderScheduleSchema
>;
