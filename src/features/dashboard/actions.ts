"use server";

import {
  getOverdueMilestones,
  getRecentCases,
  getUpcomingConsultations,
  type OverdueMilestoneRow,
  type RecentCaseRow,
  type UpcomingConsultationRow,
} from "@/features/dashboard/queries";
import { requireAuth } from "@/lib/auth-guards";
import { LimitSchema } from "@/lib/schemas";

export async function getRecentCasesAction(limit?: number): Promise<RecentCaseRow[]> {
  await requireAuth();

  const parsed = LimitSchema.safeParse(limit);
  if (!parsed.success) {
    throw new Error("Invalid limit parameter");
  }

  return getRecentCases(parsed.data);
}

export async function getUpcomingConsultationsAction(
  limit?: number,
): Promise<UpcomingConsultationRow[]> {
  await requireAuth();

  const parsed = LimitSchema.safeParse(limit);
  if (!parsed.success) {
    throw new Error("Invalid limit parameter");
  }

  return getUpcomingConsultations(parsed.data);
}

export async function getOverdueMilestonesAction(limit?: number): Promise<OverdueMilestoneRow[]> {
  await requireAuth();

  const parsed = LimitSchema.safeParse(limit);
  if (!parsed.success) {
    throw new Error("Invalid limit parameter");
  }

  return getOverdueMilestones(parsed.data);
}
