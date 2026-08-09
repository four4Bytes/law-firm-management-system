import { getStartOfDay } from "@/lib/date";
import { prisma } from "@/lib/prisma";

/** Far-future timestamp persisted to `last_reminded_at` to retire an overdue reminder. */
export const REMINDER_SUPPRESSED_AT = new Date("9999-12-31T23:59:59.000Z");

/**
 * Claims a reminder of today for a record, returning the written timestamp
 * when the claim is won. The claim is conditional on the record still being
 * eligible, so a concurrent invocation that already claimed it loses the
 * guard and receives `null`.
 *
 * @param update - A Prisma `updateMany` that writes `last_reminded_at` conditionally.
 * @returns The claim timestamp, or `null` when the guard was lost.
 */
async function claimReminder(
  update: (claimedAt: Date) => Promise<{ count: number }>,
): Promise<Date | null> {
  const claimedAt = new Date();
  const { count } = await update(claimedAt);
  return count > 0 ? claimedAt : null;
}

/**
 * Releases a milestone reminder claim, clearing `last_reminded_at` only when
 * it still holds the exact timestamp this run wrote. Never clears a claim
 * won by another invocation.
 *
 * @param id - The milestone ID.
 * @param claimedAt - The timestamp previously returned by the claim.
 */
export async function unclaimMilestoneReminder(id: string, claimedAt: Date): Promise<void> {
  await prisma.caseMilestone.updateMany({
    where: { id, last_reminded_at: claimedAt },
    data: { last_reminded_at: null },
  });
}

/**
 * Releases a consultation-claim, clearing `last_reminded_at` only when it
 * still holds the exact value this run wrote.
 *
 * @param id - The consultation ID.
 * @param claimedAt - The timestamp previously returned by the claim.
 */
export async function unclaimConsultationReminder(id: string, claimedAt: Date): Promise<void> {
  await prisma.consultation.updateMany({
    where: { id, last_reminded_at: claimedAt },
    data: { last_reminded_at: null },
  });
}

/**
 * Claims a milestone reminder for today, acting as the once-per-day guard.
 *
 * @param id - The milestone ID.
 * @returns The claim timestamp, or `null` when the claim was lost.
 */
export async function claimMilestoneReminder(id: string): Promise<Date | null> {
  const todayStart = getStartOfDay(new Date());
  return claimReminder((claimedAt) =>
    prisma.caseMilestone.updateMany({
      where: { id, OR: [{ last_reminded_at: null }, { last_reminded_at: { lt: todayStart } }] },
      data: { last_reminded_at: claimedAt },
    }),
  );
}

/**
 * Claims a consultation reminder for today, acting as the once-per-day guard.
 *
 * @param id - The consultation ID.
 * @returns The claim timestamp, or `null` when the claim was lost.
 */
export async function claimConsultationReminder(id: string): Promise<Date | null> {
  const todayStart = getStartOfDay(new Date());
  return claimReminder((claimedAt) =>
    prisma.consultation.updateMany({
      where: { id, OR: [{ last_reminded_at: null }, { last_reminded_at: { lt: todayStart } }] },
      data: { last_reminded_at: claimedAt },
    }),
  );
}

/**
 * Supresses a milestone overdue reminder by writing the far-future sentinel,
 * conditional on the record still being eligible for today. A concurrent
 * invocation that already retired it loses the guard.
 *
 * @param id - The milestone ID.
 * @returns `true` when the guard was won, `false` when already suppressed.
 */
export async function suppressMilestoneOverdue(id: string): Promise<boolean> {
  const todayStart = getStartOfDay(new Date());
  const { count } = await prisma.caseMilestone.updateMany({
    where: { id, OR: [{ last_reminded_at: null }, { last_reminded_at: { lt: todayStart } }] },
    data: { last_reminded_at: REMINDER_SUPPRESSED_AT },
  });
  return count > 0;
}

/**
 * Retracts a milestone suppression, removing the sentinel only when it is
 * still in place, so a suppression won by another invocation is untouched.
 *
 * @param id - The milestone ID.
 */
export async function retractMilestoneOverdue(id: string): Promise<void> {
  await prisma.caseMilestone.updateMany({
    where: { id, last_reminded_at: REMINDER_SUPPRESSED_AT },
    data: { last_reminded_at: null },
  });
}

/**
 * Suppresses a consultation overdue reminder, conditional on the record still
 * being eligible for today (see {@link suppressMilestoneOverdue}).
 *
 * @param id - The consultation ID.
 * @returns `true` when the guard was won, `false` when already suppressed.
 */
export async function suppressConsultationOverdue(id: string): Promise<boolean> {
  const todayStart = getStartOfDay(new Date());
  const { count } = await prisma.consultation.updateMany({
    where: { id, OR: [{ last_reminded_at: null }, { last_reminded_at: { lt: todayStart } }] },
    data: { last_reminded_at: REMINDER_SUPPRESSED_AT },
  });
  return count > 0;
}

/**
 * Retracts a consultation suppression (see {@link retractMilestoneOverdue}).
 *
 * @param id - The consultation ID.
 */
export async function retractConsultationOverdue(id: string): Promise<void> {
  await prisma.consultation.updateMany({
    where: { id, last_reminded_at: REMINDER_SUPPRESSED_AT },
    data: { last_reminded_at: null },
  });
}
