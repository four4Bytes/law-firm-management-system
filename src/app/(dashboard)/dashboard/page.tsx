import { DashboardContent } from "@/features/dashboard/components/DashboardContent/DashboardContent";
import {
  getDashboardStats,
  getOverdueMilestones,
  getRecentCases,
  getUpcomingConsultations,
} from "@/features/dashboard/queries";

export default async function DashboardPage() {
  const [stats, recentCases, upcomingConsultations, overdueMilestones] = await Promise.all([
    getDashboardStats(),
    getRecentCases(5),
    getUpcomingConsultations(5),
    getOverdueMilestones(5),
  ]);

  return (
    <DashboardContent
      stats={stats}
      recentCases={recentCases}
      upcomingConsultations={upcomingConsultations}
      overdueMilestones={overdueMilestones}
    />
  );
}
