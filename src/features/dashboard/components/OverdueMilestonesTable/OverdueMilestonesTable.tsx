"use client";

import { useEffect, useState } from "react";

import { DataTable, type ColumnDef } from "@/components/ui/DataTable/DataTable";
import { ProgressCircle } from "@/components/ui/ProgressCircle/ProgressCircle";
import { queue } from "@/components/ui/Toast/Toast";
import { getOverdueMilestonesAction } from "@/features/dashboard/actions";
import type { OverdueMilestoneRow } from "@/features/dashboard/queries";
import { formatDate } from "@/lib/date";

import styles from "./OverdueMilestonesTable.module.css";

const columns: ColumnDef<OverdueMilestoneRow>[] = [
  { id: "caseTitle", name: "Case Title", isRowHeader: true },
  { id: "milestoneTitle", name: "Milestone" },
  {
    id: "due_date",
    name: "Due Date",
    render: (value) => formatDate(value as Date),
  },
];

export function OverdueMilestonesTable() {
  const [items, setItems] = useState<OverdueMilestoneRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const result = await getOverdueMilestonesAction();
        if (cancelled) return;
        setItems(result);
      } catch {
        queue.add({
          title: "Failed to load milestones",
          description: "Could not load overdue milestones. Please try again.",
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
        <h3 className={styles.heading}>Overdue Milestones</h3>
        <div className={styles.loadingContainer}>
          <ProgressCircle aria-label="Loading overdue milestones..." />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <h3 className={styles.heading}>Overdue Milestones</h3>
      <DataTable columns={columns} rows={items} emptyContent={"No data yet"} />
    </div>
  );
}
