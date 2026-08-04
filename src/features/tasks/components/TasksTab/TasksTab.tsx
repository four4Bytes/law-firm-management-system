"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FaPenToSquare, FaTrashCan } from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog/ConfirmDialog";
import { type ColumnDef } from "@/components/ui/DataTable/DataTable";
import { ServerDataTable } from "@/components/ui/ServerDataTable/ServerDataTable";
import { StatusBadge, type StatusBadgeVariant } from "@/components/ui/StatusBadge/StatusBadge";
import { queue } from "@/components/ui/Toast/Toast";
import { getCaseTasksPaginatedAction } from "@/features/cases/actions";
import {
  deleteTaskAction,
  getActiveUsersAction,
  getTaskDetailRowByIdAction,
} from "@/features/tasks/actions";
import { AddTaskModal } from "@/features/tasks/components/AddTaskModal/AddTaskModal";
import { EditTaskModal } from "@/features/tasks/components/EditTaskModal/EditTaskModal";
import type { ActiveUserSummary, TaskDetailRow, TaskRow } from "@/features/tasks/queries";
import { TaskStatus, type Role } from "@/generated/prisma/browser";
import { formatDateTime } from "@/lib/date";
import { can, type AccessContext } from "@/lib/rbac";

import styles from "./TasksTab.module.css";

interface Props {
  caseId: string;
  access: AccessContext;
  userRole: Role | null;
}

const statusClassMap: Record<TaskStatus, StatusBadgeVariant> = {
  Pending: "pending",
  Ongoing: "ongoing",
  Submitted: "info",
  Accepted: "done",
  Rejected: "cancelled",
  Cancelled: "cancelled",
};

const columns: ColumnDef<TaskRow>[] = [
  { id: "title", name: "Title", isRowHeader: true, allowsSorting: true },
  {
    id: "status",
    name: "Status",
    allowsSorting: true,
    render: (value) => (
      <StatusBadge variant={statusClassMap[value as TaskStatus]}>{value as string}</StatusBadge>
    ),
  },
  { id: "assignTo", name: "Assigned To" },
  {
    id: "updated_at",
    name: "Updated At",
    allowsSorting: true,
    render: (value) => formatDateTime(value as Date),
  },
];

export function TasksTab({ caseId, access, userRole }: Props) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editTask, setEditTask] = useState<TaskDetailRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TaskRow | null>(null);
  const [pendingEditId, setPendingEditId] = useState<string | null>(null);
  const [users, setUsers] = useState<ActiveUserSummary[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const latestRequest = useRef(0);

  const canCreate = can(userRole, "task.create", access);

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

  async function handleEdit(task: TaskRow) {
    const requestId = ++latestRequest.current;
    setPendingEditId(task.id);
    try {
      const data = await getTaskDetailRowByIdAction(task.id);
      if (requestId !== latestRequest.current) return;
      if (!data.row) {
        queue.add({ title: "Task not found" }, { timeout: 5000 });
        return;
      }
      if (!data.canUpdate) {
        queue.add({ title: "You don't have permission to edit this task." }, { timeout: 5000 });
        return;
      }
      setEditTask(data.row);
    } catch {
      if (requestId !== latestRequest.current) return;
      queue.add({ title: "Failed to load task" }, { timeout: 5000 });
    } finally {
      if (requestId === latestRequest.current) setPendingEditId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const result = await deleteTaskAction({ taskId: deleteTarget.id });
    if (result.success) {
      setDeleteTarget(null);
      handleRefresh();
      queue.add({ title: "Task deleted" }, { timeout: 5000 });
    } else {
      queue.add({ title: result.error ?? "Failed to delete task" }, { timeout: 5000 });
    }
  }

  const actionColumn: ColumnDef<TaskRow> = {
    id: "id" as const,
    name: "Action" as const,
    render: (_value: unknown, row: unknown) => {
      const task = row as TaskRow;
      return (
        <div className={styles.actions}>
          <Button
            variant="ghost"
            aria-label="Edit task"
            onPress={() => handleEdit(task)}
            isPending={pendingEditId === task.id}
          >
            <FaPenToSquare className={styles.icon} />
          </Button>
          <Button variant="ghost" aria-label="Delete task" onPress={() => setDeleteTarget(task)}>
            <FaTrashCan className={styles.icon} />
          </Button>
        </div>
      );
    },
  };

  return (
    <>
      <ServerDataTable
        fetchAction={(p) => getCaseTasksPaginatedAction({ caseId, ...p })}
        columns={[...columns, actionColumn]}
        searchPlaceholder="Search tasks..."
        emptyContent="No tasks yet"
        loadingMessage="Loading tasks..."
        searchLabel="Search tasks"
        selectionMode="none"
        renderAddButton={canCreate}
        addButtonLabel="Add Task"
        onAddButtonPress={() => setIsAddOpen(true)}
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

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete Task"
        confirmLabel="Delete"
        onConfirm={handleDelete}
      >
        Are you sure you want to delete this task? This action cannot be undone.
      </ConfirmDialog>
    </>
  );
}
