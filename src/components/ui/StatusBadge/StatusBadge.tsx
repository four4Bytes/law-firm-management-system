import clsx from "clsx";
import type { ReactNode } from "react";

import styles from "./StatusBadge.module.css";

export type StatusBadgeVariant =
  "pending" | "ongoing" | "info" | "done" | "cancelled" | "warning" | "danger" | "accent";

interface StatusBadgeProps {
  variant: StatusBadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantClassMap: Record<StatusBadgeVariant, string> = {
  pending: styles.statusPending,
  ongoing: styles.statusOngoing,
  info: styles.statusInfo,
  done: styles.statusDone,
  cancelled: styles.statusCancelled,
  warning: styles.statusWarning,
  danger: styles.statusDanger,
  accent: styles.statusAccent,
};

export function StatusBadge({ variant, children, className }: StatusBadgeProps) {
  return (
    <span className={clsx(styles.badge, variantClassMap[variant], className)}>{children}</span>
  );
}
