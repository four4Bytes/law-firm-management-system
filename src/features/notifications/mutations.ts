import { prisma, type TransactionClient } from "@/lib/infra/prisma";
import { getAppTimeZone, getToday } from "@/lib/primitives/date";

import type { NotificationDispatchPayload } from "./schemas";

export async function createNotifications(
  data: NotificationDispatchPayload,
  tx?: TransactionClient,
): Promise<{ count: number }> {
  const client = tx || prisma;

  const records = data.userIds.map((userId) => ({
    user_id: userId,
    type: data.type,
    title: data.title,
    message: data.message,
    action_url: data.actionUrl ?? null,
    case_id: data.caseId ?? null,
    consultation_id: data.consultationId ?? null,
    milestone_id: data.milestoneId ?? null,
    task_id: data.taskId ?? null,
  }));

  const result = await client.notification.createMany({ data: records });
  return { count: result.count };
}

export async function markNotificationRead(notificationId: string, userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { id: notificationId, user_id: userId },
    data: { is_read: true },
  });
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { user_id: userId, is_read: false },
    data: { is_read: true },
  });
}

export async function pruneNotifications(retentionDays: number): Promise<number> {
  if (!Number.isSafeInteger(retentionDays) || retentionDays < 0) {
    throw new Error("retentionDays must be a non-negative safe integer");
  }

  // Start of the day N days ago in the app timezone. `setDate` on a live Date
  // would use the server's zone, so the boundary would drift with the host's TZ.
  const cutoff = getToday().subtract({ days: retentionDays }).toDate(getAppTimeZone());

  const result = await prisma.notification.deleteMany({
    where: { created_at: { lt: cutoff } },
  });
  return result.count;
}
