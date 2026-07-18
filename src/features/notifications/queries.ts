import { cache } from "react";

import { Notification } from "@/generated/prisma/browser";
import { prisma } from "@/lib/prisma";
import type { PageQuery } from "@/lib/types";

export type NotificationRow = Pick<
  Notification,
  | "id"
  | "type"
  | "title"
  | "message"
  | "is_read"
  | "action_url"
  | "case_id"
  | "consultation_id"
  | "milestone_id"
  | "task_id"
  | "created_at"
>;

const notificationSelect = {
  id: true,
  type: true,
  title: true,
  message: true,
  is_read: true,
  action_url: true,
  case_id: true,
  consultation_id: true,
  milestone_id: true,
  task_id: true,
  created_at: true,
} as const;

export const getNotificationsPaginated = cache(
  async (
    userId: string,
    { cursor, pageSize = 20 }: PageQuery,
  ): Promise<{
    rows: NotificationRow[];
    nextCursor: string | null;
  }> => {
    const notifications = await prisma.notification.findMany({
      take: pageSize + 1,
      skip: cursor ? 1 : 0,
      ...(cursor ? { cursor: { id: cursor } } : {}),
      where: { user_id: userId },
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      select: notificationSelect,
    });

    const hasMore = notifications.length > pageSize;
    if (hasMore) notifications.pop();

    return {
      rows: notifications,
      nextCursor: hasMore ? notifications[notifications.length - 1].id : null,
    };
  },
);

export const getUnreadNotificationCount = cache(async (userId: string): Promise<number> => {
  return prisma.notification.count({
    where: { user_id: userId, is_read: false },
  });
});

export const getUnreadNotifications = cache(
  async (userId: string, limit = 30): Promise<NotificationRow[]> => {
    return prisma.notification.findMany({
      where: { user_id: userId, is_read: false },
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      take: limit,
      select: notificationSelect,
    });
  },
);
