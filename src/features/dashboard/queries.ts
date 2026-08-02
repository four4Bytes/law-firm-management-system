import { cache } from "react";

import type { Prisma } from "@/generated/prisma/browser";
import { prisma } from "@/lib/prisma";

export type DashboardStats = {
  openCases: number;
  todayConsultations: number;
  totalUsers: number;
  overdueMilestones: number;
};

export type DashboardStatsScope = {
  casesUserId?: string;
  consultationsUserId?: string;
  milestonesUserId?: string;
  milestonesOwnUserId?: string;
};

export type RecentCaseRow = {
  id: string;
  case_title: string;
  clientName: string;
  status: string;
};

export type UpcomingConsultationRow = {
  id: string;
  clientName: string;
  concern: string;
  booking_datetime: Date;
  status: string;
};

export type UpcomingMilestoneRow = {
  id: string;
  caseId: string;
  caseTitle: string;
  milestoneTitle: string;
  due_date: Date;
};

const milestoneCaseFilter = (
  assignedUserId?: string,
  ownUserId?: string,
): Prisma.CaseMilestoneWhereInput => {
  if (!assignedUserId && !ownUserId) {
    return {};
  }

  const orConditions: Prisma.CaseWhereInput[] = [];

  if (assignedUserId) {
    orConditions.push({ caseAssignments: { some: { user_id: assignedUserId } } });
  }

  if (ownUserId) {
    orConditions.push({ created_by_user_id: ownUserId });
  }

  return {
    case: {
      OR: orConditions,
    },
  };
};

export const getDashboardStats = cache(
  async (scope: DashboardStatsScope = {}): Promise<DashboardStats> => {
    const { casesUserId, consultationsUserId, milestonesUserId, milestonesOwnUserId } = scope;

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const casesFilter = casesUserId ? { caseAssignments: { some: { user_id: casesUserId } } } : {};
    const consultationsFilter = consultationsUserId
      ? { consultationAssignments: { some: { user_id: consultationsUserId } } }
      : {};
    const milestoneCasesFilter = milestoneCaseFilter(milestonesUserId, milestonesOwnUserId);

    const [openCases, todayConsultations, totalUsers, overdueMilestones] = await Promise.all([
      prisma.case.count({ where: { status: "Open", ...casesFilter } }),
      prisma.consultation.count({
        where: {
          status: "Scheduled",
          booking_datetime: { gte: startOfDay, lt: endOfDay },
          ...consultationsFilter,
        },
      }),
      prisma.user.count({ where: { is_active: true } }),
      prisma.caseMilestone.count({
        where: {
          status: "Pending",
          due_date: { lt: now },
          ...milestoneCasesFilter,
        },
      }),
    ]);

    return { openCases, todayConsultations, totalUsers, overdueMilestones };
  },
);

export const getRecentCases = cache(
  async (limit = 5, assignedUserId?: string): Promise<RecentCaseRow[]> => {
    const cases = await prisma.case.findMany({
      take: limit,
      where: assignedUserId ? { caseAssignments: { some: { user_id: assignedUserId } } } : {},
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        case_title: true,
        status: true,
        client: { select: { name: true } },
      },
    });

    return cases.map((c) => ({
      id: c.id,
      case_title: c.case_title,
      clientName: c.client.name,
      status: c.status,
    }));
  },
);

export const getUpcomingConsultations = cache(
  async (limit = 5, assignedUserId?: string): Promise<UpcomingConsultationRow[]> => {
    const consultations = await prisma.consultation.findMany({
      take: limit,
      where: {
        booking_datetime: { gte: new Date() },
        status: "Scheduled",
        ...(assignedUserId
          ? { consultationAssignments: { some: { user_id: assignedUserId } } }
          : {}),
      },
      orderBy: { booking_datetime: "asc" },
      select: {
        id: true,
        concern: true,
        booking_datetime: true,
        status: true,
        client: { select: { name: true } },
      },
    });

    return consultations.map((c) => ({
      id: c.id,
      clientName: c.client.name,
      concern: c.concern,
      booking_datetime: c.booking_datetime,
      status: c.status,
    }));
  },
);

export const getUpcomingMilestones = cache(
  async (
    limit = 5,
    assignedUserId?: string,
    ownUserId?: string,
  ): Promise<UpcomingMilestoneRow[]> => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const milestones = await prisma.caseMilestone.findMany({
      take: limit,
      where: {
        status: "Pending",
        due_date: { gte: startOfDay },
        ...milestoneCaseFilter(assignedUserId, ownUserId),
      },
      orderBy: { due_date: "asc" },
      select: {
        id: true,
        case_id: true,
        title: true,
        due_date: true,
        case: { select: { case_title: true } },
      },
    });

    return milestones.map((m) => ({
      id: m.id,
      caseId: m.case_id,
      caseTitle: m.case.case_title,
      milestoneTitle: m.title,
      due_date: m.due_date,
    }));
  },
);
