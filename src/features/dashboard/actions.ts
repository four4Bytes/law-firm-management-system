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

  const assignedUserId = can(session.role, "case.read") ? undefined : session.id;
  return getDashboardStats(assignedUserId);
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
  return getUpcomingMilestones(parsed.data, assignedUserId);
}
