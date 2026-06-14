"use client";

import clsx from "clsx";

import { MiniTable } from "@/components/ui/MiniTable/MiniTable";
import { StatCard } from "@/components/ui/StatCard/StatCard";
import type {
  DashboardStats,
  OverdueMilestoneRow,
  RecentCaseRow,
  UpcomingConsultationRow,
} from "@/features/dashboard/queries";

import styles from "./DashboardContent.module.css";

interface DashboardContentProps {
  stats: DashboardStats;
  recentCases: RecentCaseRow[];
  upcomingConsultations: UpcomingConsultationRow[];
  overdueMilestones: OverdueMilestoneRow[];
}

const caseStatusClassMap: Record<string, string> = {
  Open: styles.caseStatusOpen,
  Ongoing: styles.caseStatusOngoing,
  Closed: styles.caseStatusClosed,
  Terminated: styles.caseStatusTerminated,
  Settled: styles.caseStatusSettled,
};

const recentCaseColumns = [
  { id: "case_title" as const, name: "Case Title", isRowHeader: true },
  { id: "clientName" as const, name: "Client Name" },
  {
    id: "status" as const,
    name: "Status",
    render: (value: unknown) => {
      const status = value as string | null;
      if (!status) return null;
      return (
        <span className={clsx(styles.caseStatusBadge, caseStatusClassMap[status])}>{status}</span>
      );
    },
  },
];

const upcomingConsultationColumns = [
  { id: "clientName" as const, name: "Client Name", isRowHeader: true },
  { id: "concern" as const, name: "Concern" },
  {
    id: "booking_datetime" as const,
    name: "Date & Time",
    render: (value: unknown) => {
      const date = value as Date;
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    },
  },
];

const overdueMilestoneColumns = [
  { id: "caseTitle" as const, name: "Case Title", isRowHeader: true },
  { id: "milestoneTitle" as const, name: "Milestone" },
  {
    id: "due_date" as const,
    name: "Due Date",
    render: (value: unknown) => {
      const date = value as Date;
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    },
  },
];

export function DashboardContent({
  stats,
  recentCases,
  upcomingConsultations,
  overdueMilestones,
}: DashboardContentProps) {
  return (
    <div className={styles.dashboard}>
      <div className={styles.statsRow}>
        <StatCard label="Open Cases" value={stats.openCases} accent="open" />
        <StatCard
          label="Today's Consultations"
          value={stats.todayConsultations}
          accent="scheduled"
        />
        <StatCard label="Total Users" value={stats.totalUsers} accent="users" />
        <StatCard label="Overdue Milestones" value={stats.overdueMilestones} accent="overdue" />
      </div>
      <div className={styles.tablesRow}>
        <MiniTable columns={recentCaseColumns} rows={recentCases} heading="Recent Cases" />
        <MiniTable
          columns={upcomingConsultationColumns}
          rows={upcomingConsultations}
          heading="Upcoming Consultations"
        />
      </div>
      <MiniTable
        columns={overdueMilestoneColumns}
        rows={overdueMilestones}
        heading="Overdue Milestones"
      />
    </div>
  );
}
