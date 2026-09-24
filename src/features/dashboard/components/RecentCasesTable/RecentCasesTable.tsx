"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { DataTable, type ColumnDef } from "@/components/ui/DataTable/DataTable";
import { ProgressCircle } from "@/components/ui/ProgressCircle/ProgressCircle";
import { StatusBadge, type StatusBadgeVariant } from "@/components/ui/StatusBadge/StatusBadge";
import { useNavigationProgress } from "@/components/ui/TopProgressBar/navigation-context";
import { DashboardSection } from "@/features/dashboard/components/DashboardSection/DashboardSection";
import type { RecentCaseRow } from "@/features/dashboard/queries";

import styles from "./RecentCasesTable.module.css";

interface RecentCasesTableProps {
  cases: RecentCaseRow[];
}

const caseStatusVariantMap: Record<string, StatusBadgeVariant> = {
  Open: "info",
  Closed: "done",
  Terminated: "danger",
  Settled: "cancelled",
};

const columns: ColumnDef<RecentCaseRow>[] = [
  {
    id: "case_title",
    name: "Case Title",
    isRowHeader: true,
    render: (value) => (
      <span className={styles.clamp} title={String(value ?? "")}>
        {String(value ?? "")}
      </span>
    ),
  },
  { id: "clientName", name: "Client Name" },
  {
    id: "status",
    name: "Status",
    render: (value) => {
      const status = value as string | null;
      if (!status) return null;
      return <StatusBadge variant={caseStatusVariantMap[status] ?? "info"}>{status}</StatusBadge>;
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
      <DashboardSection title="Recent Cases" count={cases.length} className={styles.section}>
        <div className={styles.loadingContainer}>
          <ProgressCircle aria-label="Loading recent cases..." />
        </div>
      </DashboardSection>
    );
  }

  return (
    <DashboardSection
      title="Recent Cases"
      count={cases.length}
      viewAllHref="/case"
      viewAllLabel="View all cases"
      className={styles.section}
    >
      <DataTable
        columns={columns}
        rows={cases}
        emptyContent="No recent cases yet. New matters will show up here."
        selectionMode="single"
        selectionBehavior="replace"
        onRowAction={(id) => {
          startLoading();
          router.push(`/case/${id}`);
        }}
        className={styles.table}
        variant="plain"
      />
    </DashboardSection>
  );
}
