import {
  getDashboardStatsAction,
  getRecentCasesAction,
  getUpcomingConsultationsAction,
  getUpcomingMilestonesAction,
} from "@/features/dashboard/actions";
import { DashboardContent } from "@/features/dashboard/components/DashboardContent/DashboardContent";
import { auth } from "@/lib/infra/auth";

import styles from "./page.module.css";

function fulfilledOrNull<T>(result: PromiseSettledResult<T>): T | null {
  return result.status === "fulfilled" ? result.value : null;
}

export default async function DashboardPage() {
  const [statsResult, recentCasesResult, upcomingConsultationsResult, upcomingMilestonesResult] =
    await Promise.allSettled([
      getDashboardStatsAction(),
      getRecentCasesAction(10),
      getUpcomingConsultationsAction(),
      getUpcomingMilestonesAction(),
    ]);

  const stats = fulfilledOrNull(statsResult);
  const recentCases = fulfilledOrNull(recentCasesResult);
  const upcomingConsultations = fulfilledOrNull(upcomingConsultationsResult);
  const upcomingMilestones = fulfilledOrNull(upcomingMilestonesResult);
  const session = await auth();

  return (
    <div className={styles.wrapper}>
      <DashboardContent
        stats={stats}
        recentCases={recentCases}
        upcomingConsultations={upcomingConsultations}
        upcomingMilestones={upcomingMilestones}
        userName={session?.user?.name}
        userRole={session?.user?.role ?? null}
      />
    </div>
  );
}
