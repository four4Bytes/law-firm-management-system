"use server";

import {
  getRecentCases,
  getUpcomingConsultations,
  getUpcomingMilestones,
  type RecentCaseRow,
  type UpcomingConsultationRow,
  type UpcomingMilestoneRow,
} from "@/features/dashboard/queries";
import { requireAuth } from "@/lib/auth-guards";
import { LimitSchema } from "@/lib/schemas";

export async function getRecentCasesAction(limit?: number): Promise<RecentCaseRow[]> {
  await requireAuth();

  const parsed = LimitSchema.safeParse(limit);
  if (!parsed.success) {
    throw new Error("Invalid limit parameter");
  }

  return getRecentCases(parsed.data ?? 10);
}

export async function getUpcomingConsultationsAction(
  limit?: number,
): Promise<UpcomingConsultationRow[]> {
  await requireAuth();

  const parsed = LimitSchema.safeParse(limit);
  if (!parsed.success) {
    throw new Error("Invalid limit parameter");
  }

  return getUpcomingConsultations(parsed.data ?? 10);
}

export async function getUpcomingMilestonesAction(limit?: number): Promise<UpcomingMilestoneRow[]> {
  await requireAuth();

  const parsed = LimitSchema.safeParse(limit);
  if (!parsed.success) {
    throw new Error("Invalid limit parameter");
  }

  return getUpcomingMilestones(parsed.data);
}
