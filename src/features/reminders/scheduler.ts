import { dispatchNotifications } from "@/features/notifications/dispatch";
import { getActiveUserIdsByRoles } from "@/features/users/queries";
import { NotificationType, Role } from "@/generated/prisma/browser";
import { getOptionalInteger } from "@/lib/env";

import {
  claimConsultationReminder,
  claimMilestoneReminder,
  releaseConsultationReminder,
  releaseMilestoneReminder,
  updateConsultationsRemindedAt,
  updateMilestonesRemindedAt,
} from "./mutations";
import { getConsultationsNeedingReminder, getMilestonesNeedingReminder } from "./queries";

const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";

export async function runReminderCheck(): Promise<void> {
  const defaultDays = getOptionalInteger("DEFAULT_REMINDER_DAYS", 3);
  const now = new Date();

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
  const reminded: string[] = [];

  for (const m of milestones) {
    const reminderDays = m.reminderDays ?? defaultDays;
    const remindThreshold = new Date(now.getTime() + reminderDays * 86_400_000);
    const isDueSoon = m.due_date <= remindThreshold && m.due_date > now;
    const isOverdue = m.due_date < now;

    if (!isDueSoon && !isOverdue) continue;
    if (m.assigneeIds.length === 0) continue;

    if (!(await claimMilestoneReminder(m.id))) continue;

    const type = isOverdue ? NotificationType.MilestoneOverdue : NotificationType.MilestoneDueSoon;
    const label = isOverdue ? "overdue" : "due soon";

    try {
      await dispatchNotifications(
        {
          userIds: m.assigneeIds,
          type,
          title: `Milestone ${label}: ${m.title}`,
          message: `Milestone "${m.title}" is ${label} — due ${m.due_date.toLocaleDateString()}`,
          actionUrl: `/case/${m.caseId}`,
          caseId: m.caseId,
          milestoneId: m.id,
        },
        SYSTEM_USER_ID,
      );
      reminded.push(m.id);
    } catch (err) {
      console.error(`Failed to dispatch milestone reminder ${m.id}:`, err);
      await releaseMilestoneReminder(m.id);
    }
  }

  if (reminded.length > 0) {
    await updateMilestonesRemindedAt(reminded);
  }
}

async function processConsultations(defaultDays: number, now: Date): Promise<void> {
  const consultations = await getConsultationsNeedingReminder();
  if (consultations.length === 0) return;

  const adminIds = await getActiveUserIdsByRoles([Role.Admin, Role.BranchManager]);
  if (adminIds.length === 0) return;

  const reminded: string[] = [];

  for (const c of consultations) {
    const reminderDays = c.reminderDays ?? defaultDays;
    const remindThreshold = new Date(now.getTime() + reminderDays * 86_400_000);
    if (!(c.booking_datetime <= remindThreshold && c.booking_datetime > now)) continue;

    if (!(await claimConsultationReminder(c.id))) continue;

    try {
      await dispatchNotifications(
        {
          userIds: adminIds,
          type: NotificationType.ConsultationReminder,
          title: "Upcoming consultation reminder",
          message: `A consultation about "${c.concern}" is scheduled for ${c.booking_datetime.toLocaleString()}`,
          actionUrl: `/consultation/${c.id}`,
          consultationId: c.id,
        },
        SYSTEM_USER_ID,
      );
      reminded.push(c.id);
    } catch (err) {
      console.error(`Failed to dispatch consultation reminder ${c.id}:`, err);
      await releaseConsultationReminder(c.id);
    }
  }

  if (reminded.length > 0) {
    await updateConsultationsRemindedAt(reminded);
  }
}
