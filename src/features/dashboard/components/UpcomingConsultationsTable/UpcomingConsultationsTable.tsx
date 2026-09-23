"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { DataTable, type ColumnDef } from "@/components/ui/DataTable/DataTable";
import { ProgressCircle } from "@/components/ui/ProgressCircle/ProgressCircle";
import { useNavigationProgress } from "@/components/ui/TopProgressBar/navigation-context";
import { DashboardSection } from "@/features/dashboard/components/DashboardSection/DashboardSection";
import type { UpcomingConsultationRow } from "@/features/dashboard/queries";
import { formatDateTime } from "@/lib/primitives/date";

import styles from "./UpcomingConsultationsTable.module.css";

interface UpcomingConsultationsTableProps {
  consultations: UpcomingConsultationRow[];
}

const columns: ColumnDef<UpcomingConsultationRow>[] = [
  { id: "clientName", name: "Client Name", isRowHeader: true },
  {
    id: "concern",
    name: "Concern",
    render: (value) => (
      <span className={styles.clamp} title={String(value ?? "")}>
        {String(value ?? "")}
      </span>
    ),
  },
  {
    id: "booking_datetime",
    name: "Date & Time",
    render: (value) => <span className={styles.dateCell}>{formatDateTime(value as Date)}</span>,
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
      <DashboardSection
        title="Upcoming Consultations"
        count={consultations.length}
        className={styles.section}
      >
        <div className={styles.loadingContainer}>
          <ProgressCircle aria-label="Loading upcoming consultations..." />
        </div>
      </DashboardSection>
    );
  }

  return (
    <DashboardSection
      title="Upcoming Consultations"
      count={consultations.length}
      viewAllHref="/consultation?status=Scheduled"
      viewAllLabel="View scheduled"
      className={styles.section}
    >
      <DataTable
        columns={columns}
        rows={consultations}
        emptyContent="No upcoming consultations. Enjoy the quiet."
        selectionMode="single"
        selectionBehavior="replace"
        onRowAction={(id) => {
          startLoading();
          router.push(`/consultation/${id}`);
        }}
        className={styles.table}
      />
    </DashboardSection>
  );
}
