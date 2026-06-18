import { DashboardContent } from "@/features/dashboard/components/DashboardContent/DashboardContent";
import { getDashboardStats } from "@/features/dashboard/queries";

import styles from "./page.module.css";

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className={styles.wrapper}>
      <DashboardContent stats={stats} />
    </div>
  );
}
