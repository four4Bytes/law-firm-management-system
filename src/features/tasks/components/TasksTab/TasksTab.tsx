"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FaBan, FaPaperPlane, FaPenToSquare, FaTrashCan } from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog/ConfirmDialog";
import { type ColumnDef } from "@/components/ui/DataTable/DataTable";
import { ServerDataTable } from "@/components/ui/ServerDataTable/ServerDataTable";
import { StatusBadge, type StatusBadgeVariant } from "@/components/ui/StatusBadge/StatusBadge";
import { queue } from "@/components/ui/Toast/Toast";
import { getCaseTasksPaginatedAction } from "@/features/cases/actions";
import {
  cancelTaskAction,
  deleteTaskAction,
  getActiveUsersAction,
  getTaskDetailRowByIdAction,
  submitTaskAction,
  type TaskCapabilities,
} from "@/features/tasks/actions";
import { AddTaskModal } from "@/features/tasks/components/AddTaskModal/AddTaskModal";
import { EditTaskModal } from "@/features/tasks/components/EditTaskModal/EditTaskModal";
import { TaskViewModal } from "@/features/tasks/components/TaskViewModal/TaskViewModal";
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
  Submitted: "info",
  Completed: "done",
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
  const [editCapabilities, setEditCapabilities] = useState<TaskCapabilities | null>(null);
  const [viewTask, setViewTask] = useState<TaskDetailRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TaskRow | null>(null);
  const [cancelTarget, setCancelTarget] = useState<TaskRow | null>(null);
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

  async function handleOpen(task: TaskRow) {
    const requestId = ++latestRequest.current;
    setPendingEditId(task.id);
    try {
      const data = await getTaskDetailRowByIdAction(task.id);
      if (requestId !== latestRequest.current) return;
      if (!data.row) {
        queue.add({ title: "Task not found" }, { timeout: 5000 });
        return;
      }
      if (data.capabilities.canEdit || data.capabilities.canReview) {
        setEditTask(data.row);
        setEditCapabilities(data.capabilities);
      } else {
        setViewTask(data.row);
      }
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

  async function handleSubmit(task: TaskRow) {
    const result = await submitTaskAction({ taskId: task.id });
    if (result.success) {
      handleRefresh();
      queue.add({ title: "Task submitted for review" }, { timeout: 5000 });
    } else {
      queue.add({ title: result.error ?? "Failed to submit task" }, { timeout: 5000 });
    }
  }

  async function handleCancelTask() {
    if (!cancelTarget) return;
    const result = await cancelTaskAction({ taskId: cancelTarget.id });
    if (result.success) {
      setCancelTarget(null);
      handleRefresh();
      queue.add({ title: "Task cancelled" }, { timeout: 5000 });
    } else {
      queue.add({ title: result.error ?? "Failed to cancel task" }, { timeout: 5000 });
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
            aria-label="Open task"
            onPress={() => handleOpen(task)}
            isPending={pendingEditId === task.id}
          >
            <FaPenToSquare className={styles.icon} />
          </Button>
          {task.status === TaskStatus.Pending && (
            <Button
              variant="ghost"
              aria-label="Submit task for review"
              onPress={() => handleSubmit(task)}
            >
              <FaPaperPlane className={styles.icon} />
            </Button>
          )}
          {task.status !== TaskStatus.Cancelled && (
            <Button
              variant="ghost"
              aria-label="Cancel task"
              onPress={() => {
                latestRequest.current++;
                setPendingEditId(null);
                setCancelTarget(task);
              }}
            >
              <FaBan className={styles.icon} />
            </Button>
          )}
          <Button
            variant="ghost"
            aria-label="Delete task"
            onPress={() => {
              latestRequest.current++;
              setPendingEditId(null);
              setDeleteTarget(task);
            }}
          >
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
        collectionDependencies={[pendingEditId]}
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

      {editTask && editCapabilities && (
        <EditTaskModal
          key={editTask.id}
          isOpen={!!editTask}
          onOpenChange={() => setEditTask(null)}
          onSuccess={handleRefresh}
          task={editTask}
          capabilities={editCapabilities}
          users={users}
        />
      )}

      {viewTask && (
        <TaskViewModal isOpen={!!viewTask} onOpenChange={() => setViewTask(null)} task={viewTask} />
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

      <ConfirmDialog
        isOpen={!!cancelTarget}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null);
        }}
        title="Cancel Task"
        confirmLabel="Cancel Task"
        onConfirm={handleCancelTask}
      >
        Are you sure you want to cancel this task? This cannot be undone.
      </ConfirmDialog>
    </>
  );
}
