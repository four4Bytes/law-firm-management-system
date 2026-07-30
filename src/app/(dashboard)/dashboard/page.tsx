import { DashboardContent } from "@/features/dashboard/components/DashboardContent/DashboardContent";
import {
  getDashboardStats,
  getRecentCases,
  getUpcomingConsultations,
  getUpcomingMilestones,
} from "@/features/dashboard/queries";

import styles from "./page.module.css";

function fulfilledOrNull<T>(result: PromiseSettledResult<T>): T | null {
  return result.status === "fulfilled" ? result.value : null;
}

export default async function DashboardPage() {
  const [statsResult, recentCasesResult, upcomingConsultationsResult, upcomingMilestonesResult] =
    await Promise.allSettled([
      getDashboardStats(),
      getRecentCases(10),
      getUpcomingConsultations(),
      getUpcomingMilestones(),
    ]);

  const stats = fulfilledOrNull(statsResult);
  const recentCases = fulfilledOrNull(recentCasesResult);
  const upcomingConsultations = fulfilledOrNull(upcomingConsultationsResult);
  const upcomingMilestones = fulfilledOrNull(upcomingMilestonesResult);

  return (
    <div className={styles.wrapper}>
      <DashboardContent
        stats={stats}
        recentCases={recentCases}
        upcomingConsultations={upcomingConsultations}
        upcomingMilestones={upcomingMilestones}
      />
    </div>
  );
}
