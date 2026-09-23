"use client";

import { useRouter } from "next/navigation";
import {
  FaCalendarDay,
  FaScaleBalanced,
  FaTriangleExclamation,
  FaUserPlus,
  FaUsers,
} from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";
import { StatCard } from "@/components/ui/StatCard/StatCard";
import { useNavigationProgress } from "@/components/ui/TopProgressBar/navigation-context";
import { RecentCasesTable } from "@/features/dashboard/components/RecentCasesTable/RecentCasesTable";
import { UpcomingConsultationsTable } from "@/features/dashboard/components/UpcomingConsultationsTable/UpcomingConsultationsTable";
import { UpcomingMilestonesTable } from "@/features/dashboard/components/UpcomingMilestonesTable/UpcomingMilestonesTable";
import type {
  DashboardStats,
  RecentCaseRow,
  UpcomingConsultationRow,
  UpcomingMilestoneRow,
} from "@/features/dashboard/queries";
import type { Role } from "@/generated/prisma/browser";
import { formatTodayLong, getDaypartGreeting } from "@/lib/primitives/date";
import { can } from "@/lib/security/rbac";

import styles from "./DashboardContent.module.css";

interface DashboardContentProps {
  stats: DashboardStats | null;
  recentCases: RecentCaseRow[] | null;
  upcomingConsultations: UpcomingConsultationRow[] | null;
  upcomingMilestones: UpcomingMilestoneRow[] | null;
  userName?: string | null;
  userRole?: Role | null;
}

interface ErrorBlockProps {
  message: string;
}

function ErrorBlock({ message }: ErrorBlockProps) {
  return <div className={styles.errorMessage}>{message}</div>;
}

export function DashboardContent({
  stats,
  recentCases,
  upcomingConsultations,
  upcomingMilestones,
  userName,
  userRole,
}: DashboardContentProps) {
  const router = useRouter();
  const { startLoading } = useNavigationProgress();
  const firstName = userName?.split(" ")[0];
  const usersHref = can(userRole, "user.read") ? "/user" : undefined;

  function navigate(href: string) {
    startLoading();
    router.push(href);
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.pageHeader}>
        <div className={styles.headingText}>
          <h2 className={styles.greeting}>
            {getDaypartGreeting()}
            {firstName ? `, ${firstName}` : ""}
          </h2>
          <p className={styles.date}>
            {formatTodayLong()} - here&apos;s what needs your attention today.
          </p>
        </div>
        <div className={styles.actions}>
          <Button variant="secondary" onPress={() => navigate("/case")}>
            <span className={styles.actionContent}>
              <FaScaleBalanced aria-hidden="true" /> View cases
            </span>
          </Button>
          <Button variant="secondary" onPress={() => navigate("/consultation")}>
            <span className={styles.actionContent}>
              <FaUserPlus aria-hidden="true" /> View consultations
            </span>
          </Button>
        </div>
      </div>
      <div className={styles.statsRow}>
        {stats ? (
          <>
            <StatCard
              label="Open Cases"
              value={stats.openCases}
              icon={<FaScaleBalanced aria-hidden="true" />}
              subtitle="active matters"
              href="/case?status=Open"
              ariaLabel={`View ${stats.openCases} open cases`}
            />
            <StatCard
              label="Today's Consultations"
              value={stats.todayConsultations}
              icon={<FaCalendarDay aria-hidden="true" />}
              subtitle="scheduled for today"
            />
            <StatCard
              label="Total Users"
              value={stats.totalUsers}
              icon={<FaUsers aria-hidden="true" />}
              subtitle="active accounts"
              href={usersHref}
              ariaLabel={`View ${stats.totalUsers} users`}
            />
            <StatCard
              label="Overdue Milestones"
              value={stats.overdueMilestones}
              icon={<FaTriangleExclamation aria-hidden="true" />}
              subtitle={stats.overdueMilestones > 0 ? "needs attention" : "all clear"}
            />
          </>
        ) : (
          <ErrorBlock message="Failed to load dashboard statistics" />
        )}
      </div>
      <div className={styles.tablesWrapper}>
        <div className={styles.primaryColumn}>
          {recentCases ? (
            <RecentCasesTable cases={recentCases} />
          ) : (
            <ErrorBlock message="Failed to load recent cases" />
          )}
        </div>
        <div className={styles.secondaryColumn}>
          {upcomingConsultations ? (
            <UpcomingConsultationsTable consultations={upcomingConsultations} />
          ) : (
            <ErrorBlock message="Failed to load upcoming consultations" />
          )}
          {upcomingMilestones ? (
            <UpcomingMilestonesTable milestones={upcomingMilestones} />
          ) : (
            <ErrorBlock message="Failed to load upcoming milestones" />
          )}
        </div>
      </div>
    </div>
  );
}
