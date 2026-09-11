import { z } from "zod";

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
