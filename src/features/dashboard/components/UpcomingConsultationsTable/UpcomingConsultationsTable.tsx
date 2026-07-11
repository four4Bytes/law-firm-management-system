"use client";

import { useEffect, useState } from "react";

import { DataTable, type ColumnDef } from "@/components/ui/DataTable/DataTable";
import { ProgressCircle } from "@/components/ui/ProgressCircle/ProgressCircle";
import { queue } from "@/components/ui/Toast/Toast";
import { getUpcomingConsultationsAction } from "@/features/dashboard/actions";
import type { UpcomingConsultationRow } from "@/features/dashboard/queries";
import { formatDateTime } from "@/lib/date";

import styles from "./UpcomingConsultationsTable.module.css";

const columns: ColumnDef<UpcomingConsultationRow>[] = [
  { id: "clientName", name: "Client Name", isRowHeader: true },
  { id: "concern", name: "Concern" },
  {
    id: "booking_datetime",
    name: "Date & Time",
    render: (value) => formatDateTime(value as Date),
  },
];

export function UpcomingConsultationsTable() {
  const [items, setItems] = useState<UpcomingConsultationRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const result = await getUpcomingConsultationsAction();
        if (cancelled) return;
        setItems(result);
      } catch {
        queue.add({
          title: "Failed to load consultations",
          description: "Could not load upcoming consultations. Please try again.",
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
        <h3 className={styles.heading}>Upcoming Consultations</h3>
        <div className={styles.loadingContainer}>
          <ProgressCircle aria-label="Loading upcoming consultations..." />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <h3 className={styles.heading}>Upcoming Consultations</h3>
      <DataTable columns={columns} rows={items} emptyContent={"No data yet"} />
    </div>
  );
}
