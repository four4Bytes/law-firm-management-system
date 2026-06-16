import { cache } from "react";

import { prisma } from "@/lib/prisma";

export type DashboardStats = {
  openCases: number;
  todayConsultations: number;
  totalUsers: number;
  overdueMilestones: number;
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

export type OverdueMilestoneRow = {
  id: string;
  caseTitle: string;
  milestoneTitle: string;
  due_date: Date;
};

export const getDashboardStats = cache(async (): Promise<DashboardStats> => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const [openCases, todayConsultations, totalUsers, overdueMilestones] = await Promise.all([
    prisma.case.count({ where: { status: "Open" } }),
    prisma.consultation.count({
      where: {
        status: "Scheduled",
        booking_datetime: { gte: startOfDay, lt: endOfDay },
      },
    }),
    prisma.user.count({ where: { is_active: true } }),
    prisma.caseMilestone.count({
      where: { status: "Pending", due_date: { lt: now } },
    }),
  ]);

  return { openCases, todayConsultations, totalUsers, overdueMilestones };
});

export const getRecentCases = cache(async (limit = 5): Promise<RecentCaseRow[]> => {
  const cases = await prisma.case.findMany({
    take: limit,
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
});

export const getUpcomingConsultations = cache(
  async (limit = 5): Promise<UpcomingConsultationRow[]> => {
    const consultations = await prisma.consultation.findMany({
      take: limit,
      where: { booking_datetime: { gte: new Date() }, status: "Scheduled" },
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

export const getOverdueMilestones = cache(async (limit = 5): Promise<OverdueMilestoneRow[]> => {
  const milestones = await prisma.caseMilestone.findMany({
    take: limit,
    where: { status: "Pending", due_date: { lt: new Date() } },
    orderBy: { due_date: "asc" },
    select: {
      id: true,
      title: true,
      due_date: true,
      case: { select: { case_title: true } },
    },
  });

  return milestones.map((m) => ({
    id: m.id,
    caseTitle: m.case.case_title,
    milestoneTitle: m.title,
    due_date: m.due_date,
  }));
});
