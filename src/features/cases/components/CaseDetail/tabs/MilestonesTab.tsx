"use client";

import clsx from "clsx";
import { useState } from "react";

import { type ColumnDef } from "@/components/ui/DataTable/DataTable";
import { ServerDataTable } from "@/components/ui/ServerDataTable/ServerDataTable";
import { queue } from "@/components/ui/Toast/Toast";
import { getCaseMilestonesPaginatedAction } from "@/features/cases/actions";
import type { CaseMilestoneListRow } from "@/features/cases/queries";
import { getMilestoneRowByIdAction } from "@/features/milestones/actions";
import { AddMilestoneModal } from "@/features/milestones/components/AddMilestoneModal/AddMilestoneModal";
import { EditMilestoneModal } from "@/features/milestones/components/EditMilestoneModal/EditMilestoneModal";
import type { MilestoneRow } from "@/features/milestones/queries";
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

const columns: ColumnDef<CaseMilestoneListRow>[] = [
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
  const [editMilestone, setEditMilestone] = useState<MilestoneRow | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  function handleRefresh() {
    setRefreshTrigger((n) => n + 1);
  }

  async function handleRowAction(id: string) {
    try {
      const data = await getMilestoneRowByIdAction(id);
      if (data) {
        setEditMilestone(data);
      } else {
        queue.add({ title: "Milestone not found" }, { timeout: 5000 });
      }
    } catch {
      queue.add({ title: "Failed to load milestone" }, { timeout: 5000 });
    }
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
        onRowAction={handleRowAction}
        refreshTrigger={refreshTrigger}
      />

      <AddMilestoneModal
        isOpen={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSuccess={handleRefresh}
        caseId={caseId}
      />

      {editMilestone && (
        <EditMilestoneModal
          key={editMilestone.id}
          isOpen={!!editMilestone}
          onOpenChange={() => setEditMilestone(null)}
          onSuccess={handleRefresh}
          milestone={editMilestone}
        />
      )}
    </>
  );
}
