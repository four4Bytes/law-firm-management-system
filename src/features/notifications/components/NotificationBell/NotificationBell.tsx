"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Dialog, DialogTrigger, Heading } from "react-aria-components";
import { FaBell } from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";
import { Popover } from "@/components/ui/Popover/Popover";
import { queue } from "@/components/ui/Toast/Toast";
import {
  getUnreadNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/features/notifications/actions";
import { useUnreadCount } from "@/features/notifications/hooks/useUnreadCount";
import type { NotificationRow } from "@/features/notifications/queries";
import { timeAgo } from "@/lib/date";

import styles from "./NotificationBell.module.css";

interface NotificationBellProps {
  initialUnreadCount: number;
}

export function NotificationBell({ initialUnreadCount }: NotificationBellProps) {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useUnreadCount(initialUnreadCount);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const pendingIdsRef = useRef(new Set<string>());
  const [pendingIds, setPendingIds] = useState(new Set<string>());

  useEffect(() => {
    let cancelled = false;
    if (isOpen) {
      const load = async () => {
        setIsLoading(true);
        try {
          const data = await getUnreadNotificationsAction();
          if (!cancelled) {
            setNotifications(data);
          }
        } catch {
          if (!cancelled) {
            queue.add({ title: "Failed to load notifications" }, { timeout: 5000 });
          }
        } finally {
          if (!cancelled) {
            setIsLoading(false);
          }
        }
      };
      void load();
    }
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  async function handleMarkRead(notificationId: string, actionUrl: string | null) {
    if (pendingIdsRef.current.has(notificationId)) return;
    pendingIdsRef.current.add(notificationId);
    setPendingIds(new Set(pendingIdsRef.current));
    try {
      const result = await markNotificationReadAction({ notificationId });
      if (result.success) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
        if (actionUrl) {
          router.push(actionUrl);
        }
      } else {
        queue.add(
          { title: result.error ?? "Failed to mark notification as read" },
          { timeout: 5000 },
        );
      }
    } catch {
      queue.add({ title: "Failed to mark notification as read" }, { timeout: 5000 });
    } finally {
      pendingIdsRef.current.delete(notificationId);
      setPendingIds(new Set(pendingIdsRef.current));
    }
  }

  async function handleMarkAllRead() {
    try {
      const result = await markAllNotificationsReadAction();
      if (result.success) {
        setUnreadCount(0);
        setNotifications([]);
      } else {
        queue.add(
          { title: result.error ?? "Failed to mark all notifications as read" },
          { timeout: 5000 },
        );
      }
    } catch {
      queue.add({ title: "Failed to mark all notifications as read" }, { timeout: 5000 });
    }
  }

  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
      <Button variant="ghost" aria-label="Notifications" className={styles.bellButton}>
        <FaBell className={styles.bellIcon} />
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount > 99 ? "99+" : unreadCount}</span>
        )}
      </Button>

      <Popover placement="bottom end" className={styles.popover}>
        <Dialog className={styles.dialog}>
          <div className={styles.header}>
            <Heading slot="title" className={styles.headerTitle}>
              Notifications
            </Heading>
            {notifications.length > 0 && (
              <Button variant="ghost" className={styles.markAllButton} onPress={handleMarkAllRead}>
                Mark all read
              </Button>
            )}
          </div>

          <div className={styles.list}>
            {isLoading ? (
              <div className={styles.loading}>Loading…</div>
            ) : notifications.length === 0 ? (
              <div className={styles.empty}>No notifications</div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={styles.item}
                  disabled={pendingIds.has(n.id)}
                  onClick={() => handleMarkRead(n.id, n.action_url)}
                >
                  <div className={styles.itemContent}>
                    <span className={styles.itemTitle}>{n.title}</span>
                    <span className={styles.itemMessage}>{n.message}</span>
                    <time className={styles.itemTime} dateTime={n.created_at.toISOString()}>
                      {timeAgo(n.created_at)}
                    </time>
                  </div>
                </button>
              ))
            )}
          </div>
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}
