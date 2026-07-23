"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import type { ColumnDef } from "@/components/ui/DataTable/DataTable";
import { ServerDataTable } from "@/components/ui/ServerDataTable/ServerDataTable";
import { useNavigationProgress } from "@/components/ui/TopProgressBar/navigation-context";
import { getCasesPaginatedAction } from "@/features/cases/actions";
import { AddCaseModal } from "@/features/cases/components/AddCaseModal/AddCaseModal";
import type { CaseRow } from "@/features/cases/queries";
import { getActiveUsersAction } from "@/features/tasks/actions";
import type { ActiveUserSummary } from "@/features/tasks/queries";

import styles from "./CaseTable.module.css";

const statusClassMap: Record<string, string> = {
  Pending: styles.statusPending,
  Done: styles.statusDone,
  Cancelled: styles.statusCancelled,
};

const columns: ColumnDef<CaseRow>[] = [
  {
    id: "case_title",
    name: "Case Title",
    isRowHeader: true,
    allowsSorting: true,
  },
  {
    id: "clientName",
    name: "Client Name",
    allowsSorting: true,
  },
  {
    id: "case_type",
    name: "Type",
    allowsSorting: true,
  },
  {
    id: "assignTo",
    name: "Assign To",
  },
  {
    id: "latestMilestone",
    name: "Latest Milestone",
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

interface CaseTableProps {
  initialCases?: CaseRow[];
  initialCursor?: string | null;
}

export function CaseTable({ initialCases, initialCursor }: CaseTableProps) {
  const router = useRouter();
  const { startLoading } = useNavigationProgress();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [users, setUsers] = useState<ActiveUserSummary[]>([]);

  const openAddModal = useCallback(async () => {
    setUsers(await getActiveUsersAction());
    setIsAddOpen(true);
  }, []);

  return (
    <>
      <ServerDataTable
        fetchAction={async (p) => {
          const result = await getCasesPaginatedAction(p);
          return { rows: result.cases, nextCursor: result.nextCursor };
        }}
        columns={columns}
        initialRows={initialCases}
        initialCursor={initialCursor}
        searchPlaceholder="Search cases..."
        emptyContent="No cases yet"
        loadingMessage="Loading cases..."
        searchLabel="Search cases"
        selectionMode="single"
        selectionBehavior="replace"
        onRowAction={(id) => {
          startLoading();
          router.push(`/case/${id}`);
        }}
        renderAddButton
        addButtonLabel="Add Case"
        onAddButtonPress={openAddModal}
        refreshTrigger={refreshTrigger}
      />

      {isAddOpen && (
        <AddCaseModal
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
