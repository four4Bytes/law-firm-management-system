"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { DataTable, type ColumnDef } from "@/components/ui/DataTable/DataTable";
import { ProgressCircle } from "@/components/ui/ProgressCircle/ProgressCircle";
import { useNavigationProgress } from "@/components/ui/TopProgressBar/navigation-context";
import type { UpcomingConsultationRow } from "@/features/dashboard/queries";
import { formatDateTime } from "@/lib/date";

import styles from "./UpcomingConsultationsTable.module.css";

interface UpcomingConsultationsTableProps {
  consultations: UpcomingConsultationRow[];
}

const columns: ColumnDef<UpcomingConsultationRow>[] = [
  { id: "clientName", name: "Client Name", isRowHeader: true },
  { id: "concern", name: "Concern" },
  {
    id: "booking_datetime",
    name: "Date & Time",
    render: (value) => formatDateTime(value as Date),
  },
];

export function UpcomingConsultationsTable({ consultations }: UpcomingConsultationsTableProps) {
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
      <DataTable
        columns={columns}
        rows={consultations}
        emptyContent={"No data yet"}
        selectionMode="single"
        selectionBehavior="replace"
        onRowAction={(id) => {
          startLoading();
          router.push(`/consultation/${id}`);
        }}
      />
    </div>
  );
}
