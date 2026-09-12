import { getStartOfDay } from "@/lib/date";
import { prisma } from "@/lib/prisma";

export interface MilestoneReminderCandidate {
  id: string;
  title: string;
  due_date: Date;
  caseId: string;
  assigneeIds: string[];
}

export interface ConsultationReminderCandidate {
  id: string;
  concern: string;
  booking_datetime: Date;
  assigneeIds: string[];
}

export async function getMilestonesNeedingReminder(): Promise<MilestoneReminderCandidate[]> {
  const todayStart = getStartOfDay(new Date());

  const milestones = await prisma.caseMilestone.findMany({
    where: {
      status: "Pending",
      OR: [{ last_reminded_at: null }, { last_reminded_at: { lt: todayStart } }],
    },
    select: {
      id: true,
      title: true,
      due_date: true,
      case_id: true,
      case: {
        select: {
          caseAssignments: {
            where: { user: { is_active: true } },
            select: { user_id: true },
          },
        },
      },
    },
  });

  return milestones.map((m) => ({
    id: m.id,
    title: m.title,
    due_date: m.due_date,
    caseId: m.case_id,
    assigneeIds: m.case.caseAssignments.map((a) => a.user_id),
  }));
}

export interface SubtaskReminderCandidate {
  id: string;
  title: string;
  taskId: string;
  caseId: string;
  due_date: Date;
  assigneeIds: string[];
  reminderDays: number | null;
}

export async function getSubtasksNeedingReminder(): Promise<SubtaskReminderCandidate[]> {
  const todayStart = getStartOfDay(new Date());

  const subtasks = await prisma.subtask.findMany({
    where: {
      status: { in: ["Pending", "InProgress"] },
      due_date: { not: null },
      OR: [{ last_reminded_at: null }, { last_reminded_at: { lt: todayStart } }],
    },
    select: {
      id: true,
      title: true,
      due_date: true,
      task_id: true,
      reminder_days: true,
      task: { select: { case_id: true } },
      assignments: {
        where: { user: { is_active: true } },
        select: { user_id: true },
      },
    },
  });

  return subtasks.map((s) => ({
    id: s.id,
    title: s.title,
    taskId: s.task_id,
    caseId: s.task.case_id,
    due_date: s.due_date!,
    assigneeIds: s.assignments.map((a) => a.user_id),
    reminderDays: s.reminder_days,
  }));
}

export async function getConsultationsNeedingReminder(): Promise<ConsultationReminderCandidate[]> {
  const todayStart = getStartOfDay(new Date());

  const consultations = await prisma.consultation.findMany({
    where: {
      status: "Scheduled",
      OR: [{ last_reminded_at: null }, { last_reminded_at: { lt: todayStart } }],
    },
    select: {
      id: true,
      concern: true,
      booking_datetime: true,
      consultationAssignments: {
        where: { user: { is_active: true } },
        select: { user_id: true },
      },
    },
  });

  return consultations.map((c) => ({
    id: c.id,
    concern: c.concern,
    booking_datetime: c.booking_datetime,
    assigneeIds: c.consultationAssignments.map((a) => a.user_id),
  }));
}
