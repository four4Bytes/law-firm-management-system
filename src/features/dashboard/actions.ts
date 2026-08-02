"use server";

import {
  getDashboardStats,
  getRecentCases,
  getUpcomingConsultations,
  getUpcomingMilestones,
  type DashboardStats,
  type RecentCaseRow,
  type UpcomingConsultationRow,
  type UpcomingMilestoneRow,
} from "@/features/dashboard/queries";
import { requireAuth } from "@/lib/auth-guards";
import { can } from "@/lib/rbac";
import { LimitSchema } from "@/lib/schemas";

export async function getDashboardStatsAction(): Promise<DashboardStats> {
  const session = await requireAuth();

  return getDashboardStats({
    casesUserId: can(session.role, "case.read") ? undefined : session.id,
    consultationsUserId: can(session.role, "consultation.read") ? undefined : session.id,
    milestonesUserId: can(session.role, "milestone.read") ? undefined : session.id,
    milestonesOwnUserId: can(session.role, "milestone.read", { own: true })
      ? session.id
      : undefined,
  });
}

export async function getRecentCasesAction(limit?: number): Promise<RecentCaseRow[]> {
  const session = await requireAuth();

  const parsed = LimitSchema.safeParse(limit);
  if (!parsed.success) {
    throw new Error("Invalid limit parameter");
  }

  const assignedUserId = can(session.role, "case.read") ? undefined : session.id;
  return getRecentCases(parsed.data ?? 10, assignedUserId);
}

export async function getUpcomingConsultationsAction(
  limit?: number,
): Promise<UpcomingConsultationRow[]> {
  const session = await requireAuth();

  const parsed = LimitSchema.safeParse(limit);
  if (!parsed.success) {
    throw new Error("Invalid limit parameter");
  }

  const assignedUserId = can(session.role, "consultation.read") ? undefined : session.id;
  return getUpcomingConsultations(parsed.data ?? 10, assignedUserId);
}

export async function getUpcomingMilestonesAction(limit?: number): Promise<UpcomingMilestoneRow[]> {
  const session = await requireAuth();

  const parsed = LimitSchema.safeParse(limit);
  if (!parsed.success) {
    throw new Error("Invalid limit parameter");
  }

  const assignedUserId = can(session.role, "milestone.read") ? undefined : session.id;
  const ownUserId = can(session.role, "milestone.read", { own: true }) ? session.id : undefined;
  return getUpcomingMilestones(parsed.data ?? 10, assignedUserId, ownUserId);
}
