"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { type ColumnDef } from "@/components/ui/DataTable/DataTable";
import { ServerDataTable } from "@/components/ui/ServerDataTable/ServerDataTable";
import { StatusBadge, type StatusBadgeVariant } from "@/components/ui/StatusBadge/StatusBadge";
import { queue } from "@/components/ui/Toast/Toast";
import { useNavigationProgress } from "@/components/ui/TopProgressBar/navigation-context";
import { getConsultationsPaginatedAction } from "@/features/consultations/actions";
import { AddConsultationModal } from "@/features/consultations/components/AddConsultationModal/AddConsultationModal";
import type { ConsultationRow } from "@/features/consultations/queries";
import { getActiveUsersAction } from "@/features/tasks/actions";
import type { ActiveUserSummary } from "@/features/tasks/queries";
import { ConsultationStatus, type Role } from "@/generated/prisma/browser";
import { formatDateTime } from "@/lib/date";
import { can } from "@/lib/rbac";

const statusClassMap: Record<ConsultationStatus, StatusBadgeVariant> = {
  Scheduled: "info",
  Completed: "done",
  Accepted: "accent",
  Rejected: "danger",
  Cancelled: "cancelled",
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
    id: "assignTo",
    name: "Assign To",
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
      return (
        <StatusBadge variant={statusClassMap[status as ConsultationStatus]}>{status}</StatusBadge>
      );
    },
  },
];

interface ConsultationTableProps {
  initialConsultations?: ConsultationRow[];
  initialCursor?: string | null;
  userRole: Role | null;
}

export function ConsultationTable({
  initialConsultations,
  initialCursor,
  userRole,
}: ConsultationTableProps) {
  const router = useRouter();
  const { startLoading } = useNavigationProgress();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [users, setUsers] = useState<ActiveUserSummary[]>([]);

  const canCreate = can(userRole, "consultation.create");

  const openAddModal = useCallback(async () => {
    try {
      const users = await getActiveUsersAction();
      setUsers(users);
      setIsAddOpen(true);
    } catch {
      queue.add({ title: "Failed to load users" }, { timeout: 5000 });
    }
  }, []);

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
        renderAddButton={canCreate}
        addButtonLabel="Add Consultation"
        onAddButtonPress={openAddModal}
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
          users={users}
        />
      )}
    </>
  );
}
