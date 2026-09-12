// Mirrors documentation/notifications.md — the reminder scheduling rules are the spec.
// Change the doc and this implementation together.

import { CalendarDate } from "@internationalized/date";

import { dispatchNotifications } from "@/features/notifications/dispatch";
import { pruneNotifications } from "@/features/notifications/mutations";
import { getDeadlineReminderPreferencesByUserIds } from "@/features/settings/queries";
import { NotificationType } from "@/generated/prisma/browser";
import { formatDate, formatDateTime, getAppTimeZone, getStartOfDay } from "@/lib/date";
import { getOptionalInteger } from "@/lib/env";

import {
  claimConsultationReminder,
  claimMilestoneReminder,
  claimSubtaskReminder,
  retractConsultationOverdue,
  retractMilestoneOverdue,
  retractSubtaskOverdue,
  suppressConsultationOverdue,
  suppressMilestoneOverdue,
  suppressSubtaskOverdue,
  unclaimConsultationReminder,
  unclaimMilestoneReminder,
  unclaimSubtaskReminder,
} from "./mutations";
import {
  getConsultationsNeedingReminder,
  getMilestonesNeedingReminder,
  getSubtasksNeedingReminder,
} from "./queries";

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
    await processMilestones(now);
  } catch (err) {
    console.error("[reminders] Milestone processing failed:", err);
  }

  try {
    await processConsultations(now);
  } catch (err) {
    console.error("[reminders] Consultation processing failed:", err);
  }

  try {
    await processSubtasks(defaultDays, now);
  } catch (err) {
    console.error("[reminders] Subtask processing failed:", err);
  }
}

function isSameDay(a: Date, b: Date): boolean {
  return getStartOfDay(a).getTime() === getStartOfDay(b).getTime();
}

function isKeyDay(now: Date, targetDate: Date, reminderDays: number): boolean {
  const timeZone = getAppTimeZone();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(targetDate);
  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  const d = Number(parts.find((p) => p.type === "day")?.value);
  const trigger = new CalendarDate(y, m, d).subtract({ days: reminderDays }).toDate(timeZone);
  return isSameDay(now, trigger) || isSameDay(now, targetDate);
}

async function processMilestones(now: Date): Promise<void> {
  const milestones = await getMilestonesNeedingReminder();

  for (const m of milestones) {
    if (m.assigneeIds.length === 0) continue;

    const isOverdue = m.due_date < now;

    let prefsMap: Awaited<ReturnType<typeof getDeadlineReminderPreferencesByUserIds>>;
    try {
      prefsMap = await getDeadlineReminderPreferencesByUserIds(m.assigneeIds);
    } catch (err) {
      console.error(`Failed to resolve milestone reminder preferences for ${m.id}:`, err);
      prefsMap = new Map(
        m.assigneeIds.map((id) => [
          id,
          {
            consultation_reminder_days: 3,
            consultation_reminder_frequency: "KeyDays" as const,
            consultation_notify_overdue: true,
            milestone_reminder_days: 5,
            milestone_reminder_frequency: "KeyDays" as const,
            milestone_notify_overdue: true,
          },
        ]),
      );
    }

    let allowedUserIds: string[] = [];

    if (isOverdue) {
      allowedUserIds = m.assigneeIds.filter((id) => {
        const prefs = prefsMap.get(id);
        return prefs ? prefs.milestone_notify_overdue : true;
      });
      if (allowedUserIds.length === 0) continue;
    } else {
      allowedUserIds = m.assigneeIds.filter((id) => {
        const prefs = prefsMap.get(id);
        if (!prefs) return false;
        const days = prefs.milestone_reminder_days;
        const isDueSoon =
          m.due_date <= new Date(now.getTime() + days * 86_400_000) && m.due_date > now;
        if (!isDueSoon) return false;
        if (prefs.milestone_reminder_frequency === "Daily") return true;
        return isKeyDay(now, m.due_date, days);
      });
      if (allowedUserIds.length === 0) continue;
    }

    const type = isOverdue ? NotificationType.MilestoneOverdue : NotificationType.MilestoneDueSoon;
    const label = isOverdue ? "overdue" : "due soon";

    let claimedAt: Date | null = null;
    if (isOverdue) {
      if (!(await suppressMilestoneOverdue(m.id))) continue;
    } else {
      claimedAt = await claimMilestoneReminder(m.id);
      if (claimedAt === null) continue;
    }

    try {
      await dispatchNotifications(
        {
          userIds: allowedUserIds,
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
      try {
        if (isOverdue) {
          await retractMilestoneOverdue(m.id);
        } else if (claimedAt !== null) {
          await unclaimMilestoneReminder(m.id, claimedAt);
        }
      } catch (rollbackErr) {
        console.error(`Failed to roll back milestone reminder ${m.id}:`, rollbackErr);
      }
      console.error(`Failed to dispatch milestone reminder ${m.id}:`, err);
    }
  }
}

async function processSubtasks(defaultDays: number, now: Date): Promise<void> {
  const subtasks = await getSubtasksNeedingReminder();

  for (const s of subtasks) {
    const reminderDays = s.reminderDays ?? defaultDays;
    const remindThreshold = new Date(now.getTime() + reminderDays * 86_400_000);
    const isDueSoon = s.due_date <= remindThreshold && s.due_date > now;
    const isOverdue = s.due_date < now;

    if (!isDueSoon && !isOverdue) continue;
    if (s.assigneeIds.length === 0) continue;

    const type = isOverdue ? NotificationType.SubtaskOverdue : NotificationType.SubtaskDueSoon;
    const label = isOverdue ? "overdue" : "due soon";

    let claimedAt: Date | null = null;
    if (isOverdue) {
      if (!(await suppressSubtaskOverdue(s.id))) continue;
    } else {
      claimedAt = await claimSubtaskReminder(s.id);
      if (claimedAt === null) continue;
    }

    try {
      await dispatchNotifications(
        {
          userIds: s.assigneeIds,
          type,
          title: `Subtask ${label}: ${s.title}`,
          message: `Subtask "${s.title}" is ${label} — due ${formatDate(s.due_date)}`,
          actionUrl: `/case/${s.caseId}`,
          caseId: s.caseId,
          taskId: s.taskId,
          subtaskId: s.id,
        },
        SYSTEM_USER_ID,
      );
    } catch (err) {
      try {
        if (isOverdue) {
          await retractSubtaskOverdue(s.id);
        } else if (claimedAt !== null) {
          await unclaimSubtaskReminder(s.id, claimedAt);
        }
      } catch (rollbackErr) {
        console.error(`Failed to roll back subtask reminder ${s.id}:`, rollbackErr);
      }
      console.error(`Failed to dispatch subtask reminder ${s.id}:`, err);
    }
  }
}

async function processConsultations(now: Date): Promise<void> {
  const consultations = await getConsultationsNeedingReminder();

  for (const c of consultations) {
    if (c.assigneeIds.length === 0) continue;

    const isOverdue = c.booking_datetime < now;

    let prefsMap: Awaited<ReturnType<typeof getDeadlineReminderPreferencesByUserIds>>;
    try {
      prefsMap = await getDeadlineReminderPreferencesByUserIds(c.assigneeIds);
    } catch (err) {
      console.error(`Failed to resolve consultation reminder preferences for ${c.id}:`, err);
      prefsMap = new Map(
        c.assigneeIds.map((id) => [
          id,
          {
            consultation_reminder_days: 3,
            consultation_reminder_frequency: "KeyDays" as const,
            consultation_notify_overdue: true,
            milestone_reminder_days: 5,
            milestone_reminder_frequency: "KeyDays" as const,
            milestone_notify_overdue: true,
          },
        ]),
      );
    }

    let allowedUserIds: string[] = [];

    if (isOverdue) {
      allowedUserIds = c.assigneeIds.filter((id) => {
        const prefs = prefsMap.get(id);
        return prefs ? prefs.consultation_notify_overdue : true;
      });
      if (allowedUserIds.length === 0) continue;
    } else {
      allowedUserIds = c.assigneeIds.filter((id) => {
        const prefs = prefsMap.get(id);
        if (!prefs) return false;
        const days = prefs.consultation_reminder_days;
        const isDueSoon =
          c.booking_datetime <= new Date(now.getTime() + days * 86_400_000) &&
          c.booking_datetime > now;
        if (!isDueSoon) return false;
        if (prefs.consultation_reminder_frequency === "Daily") return true;
        return isKeyDay(now, c.booking_datetime, days);
      });
      if (allowedUserIds.length === 0) continue;
    }

    const type = isOverdue
      ? NotificationType.ConsultationOverdue
      : NotificationType.ConsultationReminder;
    const label = isOverdue ? "overdue" : "upcoming";

    let claimedAt: Date | null = null;
    if (isOverdue) {
      if (!(await suppressConsultationOverdue(c.id))) continue;
    } else {
      claimedAt = await claimConsultationReminder(c.id);
      if (claimedAt === null) continue;
    }

    try {
      await dispatchNotifications(
        {
          userIds: allowedUserIds,
          type,
          title: label === "overdue" ? "Overdue consultation" : "Upcoming consultation reminder",
          message: `A consultation about "${c.concern}" is ${label} — scheduled for ${formatDateTime(c.booking_datetime)}`,
          actionUrl: `/consultation/${c.id}`,
          consultationId: c.id,
        },
        SYSTEM_USER_ID,
      );
    } catch (err) {
      try {
        if (isOverdue) {
          await retractConsultationOverdue(c.id);
        } else if (claimedAt !== null) {
          await unclaimConsultationReminder(c.id, claimedAt);
        }
      } catch (rollbackErr) {
        console.error(`Failed to roll back consultation reminder ${c.id}:`, rollbackErr);
      }
      console.error(`Failed to dispatch consultation reminder ${c.id}:`, err);
    }
  }
}

export const __testHelpers = {
  isSameDay,
  isKeyDay,
};
