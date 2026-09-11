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
