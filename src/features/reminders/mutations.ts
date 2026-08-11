import { getStartOfDay } from "@/lib/date";
import { prisma } from "@/lib/prisma";

// Far-future sentinel persisted to `last_reminded_at` to retire an overdue reminder.
export const REMINDER_SUPPRESSED_AT = new Date("9999-12-31T23:59:59.000Z");

function eligibleToday(id: string, todayStart: Date) {
  return { id, OR: [{ last_reminded_at: null }, { last_reminded_at: { lt: todayStart } }] };
}

async function claimReminder(
  update: (claimedAt: Date) => Promise<{ count: number }>,
): Promise<Date | null> {
  const claimedAt = new Date();
  const { count } = await update(claimedAt);
  return count > 0 ? claimedAt : null;
}

async function suppressReminder(update: () => Promise<{ count: number }>): Promise<boolean> {
  const { count } = await update();
  return count > 0;
}

async function retractReminder(update: () => Promise<{ count: number }>): Promise<void> {
  await update();
}

export async function unclaimMilestoneReminder(id: string, claimedAt: Date): Promise<void> {
  await prisma.caseMilestone.updateMany({
    where: { id, last_reminded_at: claimedAt },
    data: { last_reminded_at: null },
  });
}

export async function unclaimConsultationReminder(id: string, claimedAt: Date): Promise<void> {
  await prisma.consultation.updateMany({
    where: { id, last_reminded_at: claimedAt },
    data: { last_reminded_at: null },
  });
}

export async function claimMilestoneReminder(id: string): Promise<Date | null> {
  const todayStart = getStartOfDay(new Date());
  return claimReminder((claimedAt) =>
    prisma.caseMilestone.updateMany({
      where: eligibleToday(id, todayStart),
      data: { last_reminded_at: claimedAt },
    }),
  );
}

export async function claimConsultationReminder(id: string): Promise<Date | null> {
  const todayStart = getStartOfDay(new Date());
  return claimReminder((claimedAt) =>
    prisma.consultation.updateMany({
      where: eligibleToday(id, todayStart),
      data: { last_reminded_at: claimedAt },
    }),
  );
}

export async function suppressMilestoneOverdue(id: string): Promise<boolean> {
  const todayStart = getStartOfDay(new Date());
  return suppressReminder(() =>
    prisma.caseMilestone.updateMany({
      where: eligibleToday(id, todayStart),
      data: { last_reminded_at: REMINDER_SUPPRESSED_AT },
    }),
  );
}

export async function retractMilestoneOverdue(id: string): Promise<void> {
  await retractReminder(() =>
    prisma.caseMilestone.updateMany({
      where: { id, last_reminded_at: REMINDER_SUPPRESSED_AT },
      data: { last_reminded_at: null },
    }),
  );
}

export async function suppressConsultationOverdue(id: string): Promise<boolean> {
  const todayStart = getStartOfDay(new Date());
  return suppressReminder(() =>
    prisma.consultation.updateMany({
      where: eligibleToday(id, todayStart),
      data: { last_reminded_at: REMINDER_SUPPRESSED_AT },
    }),
  );
}

export async function retractConsultationOverdue(id: string): Promise<void> {
  await retractReminder(() =>
    prisma.consultation.updateMany({
      where: { id, last_reminded_at: REMINDER_SUPPRESSED_AT },
      data: { last_reminded_at: null },
    }),
  );
}
