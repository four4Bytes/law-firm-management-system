import { z } from "zod";

import { NotificationType } from "@/generated/prisma/browser";
import { optionalText, requiredEnum, requiredText } from "@/lib/form-utils";
import { LimitSchema } from "@/lib/schemas";

export const NotificationMarkReadSchema = z.object({
  notificationId: z.uuid(),
});

export type NotificationMarkReadPayload = z.infer<typeof NotificationMarkReadSchema>;

export const NotificationDispatchSchema = z.object({
  userIds: z.array(z.uuid()).min(1),
  type: requiredEnum(NotificationType, "Type"),
  title: requiredText(255, "Title"),
  message: requiredText(1000, "Message"),
  actionUrl: optionalText(500, "Action URL"),
  caseId: z.uuid().optional(),
  consultationId: z.uuid().optional(),
  milestoneId: z.uuid().optional(),
  taskId: z.uuid().optional(),
});

export type NotificationDispatchPayload = z.infer<typeof NotificationDispatchSchema>;

/** Payload for fetching unread notifications with a client-specified limit. */
export const UnreadNotificationsSchema = z.object({
  limit: LimitSchema,
});

export type UnreadNotificationsPayload = z.infer<typeof UnreadNotificationsSchema>;
