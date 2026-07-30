"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { DataTable, type ColumnDef } from "@/components/ui/DataTable/DataTable";
import { ProgressCircle } from "@/components/ui/ProgressCircle/ProgressCircle";
import { useNavigationProgress } from "@/components/ui/TopProgressBar/navigation-context";
import type { UpcomingMilestoneRow } from "@/features/dashboard/queries";
import { formatDate } from "@/lib/date";

import styles from "./UpcomingMilestonesTable.module.css";

interface UpcomingMilestonesTableProps {
  milestones: UpcomingMilestoneRow[];
}

const columns: ColumnDef<UpcomingMilestoneRow>[] = [
  { id: "caseTitle", name: "Case Title", isRowHeader: true },
  { id: "milestoneTitle", name: "Milestone" },
  {
    id: "due_date",
    name: "Due Date",
    render: (value) => formatDate(value as Date),
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
      <div className={styles.wrapper}>
        <h3 className={styles.heading}>Upcoming Milestones</h3>
        <div className={styles.loadingContainer}>
          <ProgressCircle aria-label="Loading upcoming milestones..." />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <h3 className={styles.heading}>Upcoming Milestones</h3>
      <DataTable
        columns={columns}
        rows={milestones}
        emptyContent={"No data yet"}
        selectionMode="single"
        selectionBehavior="replace"
        onRowAction={(id) => {
          const caseId = milestoneCaseMap.get(id);
          if (caseId) {
            startLoading();
            router.push(`/case/${caseId}?tab=milestones`);
          }
        }}
      />
    </div>
  );
}
