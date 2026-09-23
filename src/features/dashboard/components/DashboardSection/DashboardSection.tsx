"use client";

import clsx from "clsx";
import type { ReactNode } from "react";

import { Link } from "@/components/ui/Link/Link";

import styles from "./DashboardSection.module.css";

interface DashboardSectionProps {
  title: string;
  count?: number;
  viewAllHref?: string;
  viewAllLabel?: string;
  children: ReactNode;
  className?: string;
}

export function DashboardSection({
  title,
  count,
  viewAllHref,
  viewAllLabel = "View all",
  children,
  className,
}: DashboardSectionProps) {
  return (
    <section className={clsx(styles.section, className)}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h3 className={styles.heading}>{title}</h3>
          {count !== undefined && <span className={styles.count}>{count}</span>}
        </div>
        {viewAllHref && (
          <Link href={viewAllHref} className={styles.viewAll}>
            {viewAllLabel}
          </Link>
        )}
      </div>
      <div className={styles.body}>{children}</div>
    </section>
  );
}
