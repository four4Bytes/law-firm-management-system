// Mirrors documentation/notifications.md — the reminder scheduling rules are the spec.
// Change the doc and this implementation together.

import { dispatchNotifications } from "@/features/notifications/dispatch";
import { pruneNotifications } from "@/features/notifications/mutations";
import { NotificationType } from "@/generated/prisma/browser";
import { formatDate, formatDateTime } from "@/lib/date";
import { getOptionalInteger } from "@/lib/env";

import {
  claimConsultationReminder,
  claimMilestoneReminder,
  retractConsultationOverdue,
  retractMilestoneOverdue,
  suppressConsultationOverdue,
  suppressMilestoneOverdue,
  unclaimConsultationReminder,
  unclaimMilestoneReminder,
} from "./mutations";
import { getConsultationsNeedingReminder, getMilestonesNeedingReminder } from "./queries";

const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";

export async function runReminderCheck(): Promise<void> {
  const defaultDays = getOptionalInteger("DEFAULT_REMINDER_DAYS", 3);
  const retentionDays = getOptionalInteger("NOTIFICATION_RETENTION_DAYS", 90);
  const now = new Date();

  try {
    await pruneNotifications(retentionDays);
  } catch (err) {
    console.error("[reminders] Notification pruning failed:", err);
  }

  try {
    await processMilestones(defaultDays, now);
  } catch (err) {
    console.error("[reminders] Milestone processing failed:", err);
  }

  try {
    await processConsultations(defaultDays, now);
  } catch (err) {
    console.error("[reminders] Consultation processing failed:", err);
  }
}

async function processMilestones(defaultDays: number, now: Date): Promise<void> {
  const milestones = await getMilestonesNeedingReminder();

  for (const m of milestones) {
    const reminderDays = m.reminderDays ?? defaultDays;
    const remindThreshold = new Date(now.getTime() + reminderDays * 86_400_000);
    const isDueSoon = m.due_date <= remindThreshold && m.due_date > now;
    const isOverdue = m.due_date < now;

    if (!isDueSoon && !isOverdue) continue;
    if (m.assigneeIds.length === 0) continue;

    const type = isOverdue ? NotificationType.MilestoneOverdue : NotificationType.MilestoneDueSoon;
    const label = isOverdue ? "overdue" : "due soon";

    let claimedAt: Date | null = null;
    const guardWon = isOverdue
      ? await suppressMilestoneOverdue(m.id)
      : (claimedAt = await claimMilestoneReminder(m.id)) !== null;
    if (!guardWon) continue;

    try {
      await dispatchNotifications(
        {
          userIds: m.assigneeIds,
          type,
          title: `Milestone ${label}: ${m.title}`,
          message: `Milestone "${m.title}" is ${label} — due ${formatDate(m.due_date)}`,
          actionUrl: `/case/${m.caseId}`,
          caseId: m.caseId,
          milestoneId: m.id,
        },
        SYSTEM_USER_ID,
      );
    } catch (err) {
      if (isOverdue) {
        await retractMilestoneOverdue(m.id);
      } else {
        await unclaimMilestoneReminder(m.id, claimedAt!);
      }
      console.error(`Failed to dispatch milestone reminder ${m.id}:`, err);
    }
  }
}

async function processConsultations(defaultDays: number, now: Date): Promise<void> {
  const consultations = await getConsultationsNeedingReminder();

  for (const c of consultations) {
    const reminderDays = c.reminderDays ?? defaultDays;
    const remindThreshold = new Date(now.getTime() + reminderDays * 86_400_000);
    const isDueSoon = c.booking_datetime <= remindThreshold && c.booking_datetime > now;
    const isOverdue = c.booking_datetime < now;

    if (!isDueSoon && !isOverdue) continue;
    if (c.assigneeIds.length === 0) continue;

    const type = isOverdue
      ? NotificationType.ConsultationOverdue
      : NotificationType.ConsultationReminder;
    const label = isOverdue ? "overdue" : "upcoming";

    let claimedAt: Date | null = null;
    const guardWon = isOverdue
      ? await suppressConsultationOverdue(c.id)
      : (claimedAt = await claimConsultationReminder(c.id)) !== null;
    if (!guardWon) continue;

    try {
      await dispatchNotifications(
        {
          userIds: c.assigneeIds,
          type,
          title: label === "overdue" ? "Overdue consultation" : "Upcoming consultation reminder",
          message: `A consultation about "${c.concern}" is ${label} — scheduled for ${formatDateTime(c.booking_datetime)}`,
          actionUrl: `/consultation/${c.id}`,
          consultationId: c.id,
        },
        SYSTEM_USER_ID,
      );
    } catch (err) {
      if (isOverdue) {
        await retractConsultationOverdue(c.id);
      } else {
        await unclaimConsultationReminder(c.id, claimedAt!);
      }
      console.error(`Failed to dispatch consultation reminder ${c.id}:`, err);
    }
  }
}
