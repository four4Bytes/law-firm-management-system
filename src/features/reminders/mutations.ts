import { prisma } from "@/lib/prisma";

/** Far-future timestamp persisted to `last_reminded_at` to retire an overdue reminder. */
export const REMINDER_SUPPRESSED_AT = new Date("9999-12-31T23:59:59.000Z");

export async function claimMilestoneReminder(id: string): Promise<boolean> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count } = await prisma.caseMilestone.updateMany({
    where: {
      id,
      OR: [{ last_reminded_at: null }, { last_reminded_at: { lt: todayStart } }],
    },
    data: { last_reminded_at: new Date() },
  });
  return count > 0;
}

export async function claimConsultationReminder(id: string): Promise<boolean> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count } = await prisma.consultation.updateMany({
    where: {
      id,
      OR: [{ last_reminded_at: null }, { last_reminded_at: { lt: todayStart } }],
    },
    data: { last_reminded_at: new Date() },
  });
  return count > 0;
}

export async function suppressMilestoneOverdue(id: string): Promise<void> {
  await prisma.caseMilestone.update({
    where: { id },
    data: { last_reminded_at: REMINDER_SUPPRESSED_AT },
  });
}
