"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { DataTable, type ColumnDef } from "@/components/ui/DataTable/DataTable";
import { ProgressCircle } from "@/components/ui/ProgressCircle/ProgressCircle";
import { useNavigationProgress } from "@/components/ui/TopProgressBar/navigation-context";
import { DashboardSection } from "@/features/dashboard/components/DashboardSection/DashboardSection";
import type { UpcomingMilestoneRow } from "@/features/dashboard/queries";
import { formatDateTime } from "@/lib/primitives/date";

import styles from "./UpcomingMilestonesTable.module.css";

interface UpcomingMilestonesTableProps {
  milestones: UpcomingMilestoneRow[];
}

const columns: ColumnDef<UpcomingMilestoneRow>[] = [
  {
    id: "caseTitle",
    name: "Case Title",
    isRowHeader: true,
    render: (value) => (
      <span className={styles.clamp} title={String(value ?? "")}>
        {String(value ?? "")}
      </span>
    ),
  },
  {
    id: "milestoneTitle",
    name: "Milestone",
    render: (value) => (
      <span className={styles.clamp} title={String(value ?? "")}>
        {String(value ?? "")}
      </span>
    ),
  },
  {
    id: "due_date",
    name: "Due Date",
    render: (value) => <span className={styles.dateCell}>{formatDateTime(value as Date)}</span>,
  },
];

export function UpcomingMilestonesTable({ milestones }: UpcomingMilestonesTableProps) {
  const router = useRouter();
  const { startLoading } = useNavigationProgress();
  const milestoneCaseMap = new Map(milestones.map((m) => [m.id, m.caseId]));
  const [isClient, setIsClient] = useState(false);
  const [, startTransition] = useTransition();
  useEffect(() => {
    startTransition(() => setIsClient(true));
  }, [startTransition]);

  if (!isClient) {
    return (
      <DashboardSection
        title="Upcoming Milestones"
        count={milestones.length}
        className={styles.section}
      >
        <div className={styles.loadingContainer}>
          <ProgressCircle aria-label="Loading upcoming milestones..." />
        </div>
      </DashboardSection>
    );
  }

  return (
    <DashboardSection
      title="Upcoming Milestones"
      count={milestones.length}
      className={styles.section}
    >
      <DataTable
        columns={columns}
        rows={milestones}
        emptyContent="No upcoming milestones — all clear."
        selectionMode="single"
        selectionBehavior="replace"
        onRowAction={(id) => {
          const caseId = milestoneCaseMap.get(id);
          if (caseId) {
            startLoading();
            router.push(`/case/${caseId}?tab=milestones`);
          }
        }}
        className={styles.table}
        variant="plain"
      />
    </DashboardSection>
  );
}
