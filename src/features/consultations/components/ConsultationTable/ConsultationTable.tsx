"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { type ColumnDef } from "@/components/ui/DataTable/DataTable";
import { ServerDataTable } from "@/components/ui/ServerDataTable/ServerDataTable";
import { useNavigationProgress } from "@/components/ui/TopProgressBar/navigation-context";
import { getConsultationsPaginatedAction } from "@/features/consultations/actions";
import { AddConsultationModal } from "@/features/consultations/components/AddConsultationModal/AddConsultationModal";
import type { ConsultationRow } from "@/features/consultations/queries";
import { formatDateTime } from "@/lib/date";

import styles from "./ConsultationTable.module.css";

const statusClassMap: Record<string, string> = {
  Scheduled: styles.statusScheduled,
  Completed: styles.statusCompleted,
  Accepted: styles.statusAccepted,
  Rejected: styles.statusRejected,
  Cancelled: styles.statusCancelled,
};

const columns: ColumnDef<ConsultationRow>[] = [
  {
    id: "clientName",
    name: "Client Name",
    isRowHeader: true,
    allowsSorting: true,
  },
  {
    id: "concern",
    name: "Concern",
    allowsSorting: true,
  },
  {
    id: "createdByName",
    name: "Created By",
    allowsSorting: true,
  },
  {
    id: "booking_datetime",
    name: "Date & Time",
    allowsSorting: true,
    render: (value) => {
      const date = value as Date;
      return formatDateTime(date);
    },
  },
  {
    id: "status",
    name: "Status",
    allowsSorting: true,
    render: (value) => {
      const status = value as string | null;
      if (!status) return null;
      return <span className={clsx(styles.statusBadge, statusClassMap[status])}>{status}</span>;
    },
  },
];

interface ConsultationTableProps {
  initialConsultations?: ConsultationRow[];
  initialCursor?: string | null;
}

export function ConsultationTable({ initialConsultations, initialCursor }: ConsultationTableProps) {
  const router = useRouter();
  const { startLoading } = useNavigationProgress();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  return (
    <>
      <ServerDataTable
        fetchAction={async (p) => {
          const result = await getConsultationsPaginatedAction(p);
          return { rows: result.consultations, nextCursor: result.nextCursor };
        }}
        columns={columns}
        initialRows={initialConsultations}
        initialCursor={initialCursor}
        searchPlaceholder="Search consultations..."
        emptyContent="No consultations yet"
        loadingMessage="Loading consultations..."
        searchLabel="Search consultations"
        selectionMode="single"
        selectionBehavior="replace"
        onRowAction={(id) => {
          startLoading();
          router.push(`/consultation/${id}`);
        }}
        renderAddButton
        addButtonLabel="Add Consultation"
        onAddButtonPress={() => setIsAddOpen(true)}
        refreshTrigger={refreshTrigger}
      />

      {isAddOpen && (
        <AddConsultationModal
          isOpen={isAddOpen}
          onOpenChange={setIsAddOpen}
          onSuccess={() => {
            setIsAddOpen(false);
            setRefreshTrigger((t) => t + 1);
          }}
        />
      )}
    </>
  );
}
