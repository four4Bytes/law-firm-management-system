"use client";

import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";

import { type ColumnDef } from "@/components/ui/DataTable/DataTable";
import { ServerDataTable } from "@/components/ui/ServerDataTable/ServerDataTable";
import { queue } from "@/components/ui/Toast/Toast";
import { getCaseTasksPaginatedAction } from "@/features/cases/actions";
import { getActiveUsersAction, getTaskDetailRowByIdAction } from "@/features/tasks/actions";
import { AddTaskModal } from "@/features/tasks/components/AddTaskModal/AddTaskModal";
import { EditTaskModal } from "@/features/tasks/components/EditTaskModal/EditTaskModal";
import type { ActiveUserSummary, TaskDetailRow, TaskRow } from "@/features/tasks/queries";
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
  const [editTask, setEditTask] = useState<TaskDetailRow | null>(null);
  const [users, setUsers] = useState<ActiveUserSummary[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRefresh = useCallback(() => setRefreshTrigger((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await getActiveUsersAction();
        if (cancelled) return;
        setUsers(data);
      } catch {
        if (cancelled) return;
        queue.add({ title: "Failed to load assignees" }, { timeout: 5000 });
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleRowAction(id: string) {
    try {
      const data = await getTaskDetailRowByIdAction(id);
      if (data) {
        setEditTask(data);
      } else {
        queue.add({ title: "Task not found" }, { timeout: 5000 });
      }
    } catch {
      queue.add({ title: "Failed to load task" }, { timeout: 5000 });
    }
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
        onRowAction={handleRowAction}
        refreshTrigger={refreshTrigger}
      />

      <AddTaskModal
        isOpen={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSuccess={handleRefresh}
        caseId={caseId}
        users={users}
      />

      {editTask && (
        <EditTaskModal
          key={editTask.id}
          isOpen={!!editTask}
          onOpenChange={() => setEditTask(null)}
          onSuccess={handleRefresh}
          task={editTask}
          users={users}
        />
      )}
    </>
  );
}
