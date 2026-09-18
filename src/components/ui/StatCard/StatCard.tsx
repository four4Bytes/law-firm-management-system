import clsx from "clsx";

import styles from "./StatCard.module.css";

interface StatCardProps {
  label: string;
  value: number;
  accent?: "open" | "scheduled" | "users" | "overdue";
  className?: string;
}

const accentClassMap: Record<string, string> = {
  open: styles.accentOpen,
  scheduled: styles.accentScheduled,
  users: styles.accentUsers,
  overdue: styles.accentOverdue,
};

export function StatCard({ label, value, accent, className }: StatCardProps) {
  return (
    <div className={clsx(styles.card, accent && accentClassMap[accent], className)}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
    </div>
  );
}
