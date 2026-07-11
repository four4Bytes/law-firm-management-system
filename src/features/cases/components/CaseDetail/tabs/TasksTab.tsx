"use client";

import clsx from "clsx";
import { useState } from "react";

import { type ColumnDef } from "@/components/ui/DataTable/DataTable";
import { ServerDataTable } from "@/components/ui/ServerDataTable/ServerDataTable";
import { getCaseTasksPaginatedAction } from "@/features/cases/actions";
import { AddTaskModal } from "@/features/tasks/components/AddTaskModal/AddTaskModal";
import { EditTaskModal } from "@/features/tasks/components/EditTaskModal/EditTaskModal";
import type { TaskRow } from "@/features/tasks/queries";
import { formatDateTime } from "@/lib/date";

import tabStyles from "./Tab.module.css";

interface Props {
  caseId: string;
}

const statusClassMap: Record<string, string> = {
  Pending: tabStyles.statusPending,
  Ongoing: tabStyles.statusOngoing,
  Submitted: tabStyles.statusInfo,
  Accepted: tabStyles.statusDone,
  Rejected: tabStyles.statusCancelled,
  Cancelled: tabStyles.statusCancelled,
};

const columns: ColumnDef<TaskRow>[] = [
  { id: "title", name: "Title", isRowHeader: true, allowsSorting: true },
  {
    id: "status",
    name: "Status",
    allowsSorting: true,
    render: (value) => {
      const s = value as string;
      return <span className={clsx(tabStyles.badge, statusClassMap[s])}>{s}</span>;
    },
  },
  { id: "assignTo", name: "Assigned To" },
  {
    id: "updated_at",
    name: "Updated At",
    allowsSorting: true,
    render: (value) => formatDateTime(value as Date),
  },
];

export function TasksTab({ caseId }: Props) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  function handleRefresh() {
    setRefreshTrigger((n) => n + 1);
  }

  return (
    <>
      <ServerDataTable
        fetchAction={(p) => getCaseTasksPaginatedAction({ caseId, ...p })}
        columns={columns}
        searchPlaceholder="Search tasks..."
        emptyContent="No tasks yet"
        loadingMessage="Loading tasks..."
        searchLabel="Search tasks"
        renderAddButton
        addButtonLabel="Add Task"
        onAddButtonPress={() => setIsAddOpen(true)}
        onRowAction={(id) => {
          setSelectedTaskId(id);
          setIsEditOpen(true);
        }}
        refreshTrigger={refreshTrigger}
      />

      <AddTaskModal
        isOpen={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSuccess={handleRefresh}
        caseId={caseId}
      />

      {isEditOpen && selectedTaskId && (
        <EditTaskModal
          isOpen={isEditOpen}
          onOpenChange={setIsEditOpen}
          onSuccess={handleRefresh}
          taskId={selectedTaskId}
        />
      )}
    </>
  );
}
