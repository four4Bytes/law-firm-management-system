"use client";

import clsx from "clsx";
import { useState } from "react";

import { type ColumnDef } from "@/components/ui/DataTable/DataTable";
import { ServerDataTable } from "@/components/ui/ServerDataTable/ServerDataTable";
import { getCaseMilestonesPaginatedAction } from "@/features/cases/actions";
import type { MilestoneRow } from "@/features/cases/queries";
import { AddMilestoneModal } from "@/features/milestones/components/AddMilestoneModal/AddMilestoneModal";
import { EditMilestoneModal } from "@/features/milestones/components/EditMilestoneModal/EditMilestoneModal";
import { formatDate } from "@/lib/date";

import tabStyles from "./Tab.module.css";

interface Props {
  caseId: string;
}

const statusClassMap: Record<string, string> = {
  Pending: tabStyles.statusPending,
  Done: tabStyles.statusDone,
  Cancelled: tabStyles.statusCancelled,
};

const columns: ColumnDef<MilestoneRow>[] = [
  { id: "title", name: "Title", isRowHeader: true, allowsSorting: true },
  {
    id: "due_date",
    name: "Due Date",
    allowsSorting: true,
    render: (value) => formatDate(value as Date),
  },
  {
    id: "status",
    name: "Status",
    allowsSorting: true,
    render: (value) => {
      const s = value as string;
      return <span className={clsx(tabStyles.badge, statusClassMap[s])}>{s}</span>;
    },
  },
];

export function MilestonesTab({ caseId }: Props) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  function handleRefresh() {
    setRefreshTrigger((n) => n + 1);
  }

  return (
    <>
      <ServerDataTable
        fetchAction={(p) => getCaseMilestonesPaginatedAction({ caseId, ...p })}
        columns={columns}
        searchPlaceholder="Search milestones..."
        emptyContent="No milestones yet"
        loadingMessage="Loading milestones..."
        searchLabel="Search milestones"
        renderAddButton
        addButtonLabel="Add Milestone"
        onAddButtonPress={() => setIsAddOpen(true)}
        onRowAction={(id) => {
          setSelectedMilestoneId(id);
          setIsEditOpen(true);
        }}
        refreshTrigger={refreshTrigger}
      />

      <AddMilestoneModal
        isOpen={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSuccess={handleRefresh}
        caseId={caseId}
      />

      {isEditOpen && selectedMilestoneId && (
        <EditMilestoneModal
          isOpen={isEditOpen}
          onOpenChange={setIsEditOpen}
          onSuccess={handleRefresh}
          milestoneId={selectedMilestoneId}
        />
      )}
    </>
  );
}
