"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { DataTable, type ColumnDef } from "@/components/ui/DataTable/DataTable";
import { ProgressCircle } from "@/components/ui/ProgressCircle/ProgressCircle";
import { useNavigationProgress } from "@/components/ui/TopProgressBar/navigation-context";
import type { RecentCaseRow } from "@/features/dashboard/queries";

import styles from "./RecentCasesTable.module.css";

interface RecentCasesTableProps {
  cases: RecentCaseRow[];
}

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

export function RecentCasesTable({ cases }: RecentCasesTableProps) {
  const router = useRouter();
  const { startLoading } = useNavigationProgress();
  const [isClient, setIsClient] = useState(false);
  const [, startTransition] = useTransition();
  useEffect(() => {
    startTransition(() => setIsClient(true));
  }, [startTransition]);

  if (!isClient) {
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
      <DataTable
        columns={columns}
        rows={cases}
        emptyContent={"No data yet"}
        selectionMode="single"
        selectionBehavior="replace"
        onRowAction={(id) => {
          startLoading();
          router.push(`/case/${id}`);
        }}
      />
    </div>
  );
}
