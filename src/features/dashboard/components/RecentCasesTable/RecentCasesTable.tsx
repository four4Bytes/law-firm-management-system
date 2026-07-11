"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";

import { DataTable, type ColumnDef } from "@/components/ui/DataTable/DataTable";
import { ProgressCircle } from "@/components/ui/ProgressCircle/ProgressCircle";
import { queue } from "@/components/ui/Toast/Toast";
import { getRecentCasesAction } from "@/features/dashboard/actions";
import type { RecentCaseRow } from "@/features/dashboard/queries";

import styles from "./RecentCasesTable.module.css";

const caseStatusClassMap: Record<string, string> = {
  Open: styles.caseStatusOpen,
  Ongoing: styles.caseStatusOngoing,
  Closed: styles.caseStatusClosed,
  Terminated: styles.caseStatusTerminated,
  Settled: styles.caseStatusSettled,
};

const columns: ColumnDef<RecentCaseRow>[] = [
  { id: "case_title", name: "Case Title", isRowHeader: true },
  { id: "clientName", name: "Client Name" },
  {
    id: "status",
    name: "Status",
    render: (value) => {
      const status = value as string | null;
      if (!status) return null;
      return (
        <span className={clsx(styles.caseStatusBadge, caseStatusClassMap[status])}>{status}</span>
      );
    },
  },
];

export function RecentCasesTable() {
  const [items, setItems] = useState<RecentCaseRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const result = await getRecentCasesAction();
        if (cancelled) return;
        setItems(result);
      } catch {
        queue.add({
          title: "Failed to load cases",
          description: "Could not load recent cases. Please try again.",
        });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return (
      <div className={styles.wrapper}>
        <h3 className={styles.heading}>Recent Cases</h3>
        <div className={styles.loadingContainer}>
          <ProgressCircle aria-label="Loading recent cases..." />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <h3 className={styles.heading}>Recent Cases</h3>
      <DataTable columns={columns} rows={items} emptyContent={"No data yet"} />
    </div>
  );
}
