"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";

import { type ColumnDef } from "@/components/ui/DataTable/DataTable";
import { ServerDataTable } from "@/components/ui/ServerDataTable/ServerDataTable";
import { getCasesPaginatedAction } from "@/features/cases/actions";
import type { CaseRow } from "@/features/cases/queries";

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

export function CaseTable() {
  const router = useRouter();

  return (
    <ServerDataTable
      fetchAction={async (p) => {
        const result = await getCasesPaginatedAction(p);
        return { rows: result.cases, nextCursor: result.nextCursor };
      }}
      columns={columns}
      searchPlaceholder="Search cases..."
      emptyContent="No cases yet"
      loadingMessage="Loading cases..."
      searchLabel="Search cases"
      selectionMode="single"
      selectionBehavior="replace"
      onRowAction={(id) => router.push(`/case/${id}`)}
      renderAddButton
      addButtonLabel="Add Case"
    />
  );
}
