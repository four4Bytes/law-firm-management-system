import { prisma } from "@/lib/prisma";

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

export async function releaseMilestoneReminder(id: string): Promise<void> {
  await prisma.caseMilestone.update({
    where: { id },
    data: { last_reminded_at: null },
  });
}

export async function releaseConsultationReminder(id: string): Promise<void> {
  await prisma.consultation.update({
    where: { id },
    data: { last_reminded_at: null },
  });
}

export async function updateMilestonesRemindedAt(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await prisma.caseMilestone.updateMany({
    where: { id: { in: ids } },
    data: { last_reminded_at: new Date() },
  });
}

export async function updateConsultationsRemindedAt(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await prisma.consultation.updateMany({
    where: { id: { in: ids } },
    data: { last_reminded_at: new Date() },
  });
}
