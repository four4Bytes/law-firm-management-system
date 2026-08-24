"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FaEye, FaPenToSquare, FaTrashCan } from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog/ConfirmDialog";
import { type ColumnDef } from "@/components/ui/DataTable/DataTable";
import { ServerDataTable } from "@/components/ui/ServerDataTable/ServerDataTable";
import { StatusBadge, type StatusBadgeVariant } from "@/components/ui/StatusBadge/StatusBadge";
import { getCaseTasksPaginatedAction } from "@/features/cases/actions";
import {
  deleteTaskAction,
  getActiveUsersAction,
  getTaskDetailRowByIdAction,
  type TaskCapabilities,
} from "@/features/tasks/actions";
import { AddTaskModal } from "@/features/tasks/components/AddTaskModal/AddTaskModal";
import { EditTaskModal } from "@/features/tasks/components/EditTaskModal/EditTaskModal";
import { ViewTaskModal } from "@/features/tasks/components/ViewTaskModal/ViewTaskModal";
import type { ActiveUserSummary, TaskDetailRow, TaskRow } from "@/features/tasks/queries";
import { TaskStatus, type Role } from "@/generated/prisma/browser";
import { can, type AccessContext } from "@/lib/rbac";
import {
  toastActionError,
  toastDenied,
  toastError,
  toastNotFound,
  toastSuccess,
} from "@/lib/toast-utils";

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
  { id: "reviewers", name: "Reviewers" },
];

export function TasksTab({ caseId, access, userRole }: Props) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editTask, setEditTask] = useState<TaskDetailRow | null>(null);
  const [editCapabilities, setEditCapabilities] = useState<TaskCapabilities | null>(null);
  const [editCurrentUserId, setEditCurrentUserId] = useState<string | null>(null);
  const [viewTask, setViewTask] = useState<TaskDetailRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TaskRow | null>(null);
  const [pendingEditId, setPendingEditId] = useState<string | null>(null);
  const [pendingViewId, setPendingViewId] = useState<string | null>(null);
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
        toastError("Failed to load assignees", "We couldn't load the user list. Please try again.");
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleView(task: TaskRow) {
    const requestId = ++latestRequest.current;
    setPendingViewId(task.id);
    try {
      const data = await getTaskDetailRowByIdAction(task.id);
      if (requestId !== latestRequest.current) return;
      if (!data.row) {
        toastNotFound("Task");
        return;
      }
      setViewTask(data.row);
    } catch (error) {
      if (requestId !== latestRequest.current) return;
      const isForbidden = (error as { digest?: string })?.digest === "FORBIDDEN";
      if (isForbidden) {
        toastDenied();
      } else {
        toastError(
          "Failed to load task",
          "Something went wrong while loading this task. Please try again.",
        );
      }
    } finally {
      if (requestId === latestRequest.current) setPendingViewId(null);
    }
  }

  async function handleEdit(task: TaskRow) {
    const requestId = ++latestRequest.current;
    setPendingEditId(task.id);
    try {
      const data = await getTaskDetailRowByIdAction(task.id);
      if (requestId !== latestRequest.current) return;
      if (!data.row) {
        toastNotFound("Task");
        return;
      }
      const c = data.capabilities;
      if (c.canEdit || c.canReview || c.canManageReviewers || c.canSubmit || c.canCancel) {
        setEditTask(data.row);
        setEditCapabilities(data.capabilities);
        setEditCurrentUserId(data.currentUserId);
      } else {
        toastDenied();
      }
    } catch (error) {
      if (requestId !== latestRequest.current) return;
      const isForbidden = (error as { digest?: string })?.digest === "FORBIDDEN";
      if (isForbidden) {
        toastDenied();
      } else {
        toastError(
          "Failed to load task",
          "Something went wrong while loading this task. Please try again.",
        );
      }
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
      toastSuccess("Task deleted", "The task has been permanently removed.");
    } else {
      toastActionError(result, "delete task");
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
            aria-label="View task"
            onPress={() => handleView(task)}
            isPending={pendingViewId === task.id}
          >
            <FaEye className={styles.icon} />
          </Button>
          <Button
            variant="ghost"
            aria-label="Edit task"
            onPress={() => handleEdit(task)}
            isPending={pendingEditId === task.id}
          >
            <FaPenToSquare className={styles.icon} />
          </Button>
          <Button
            variant="ghost"
            aria-label="Delete task"
            onPress={() => {
              latestRequest.current++;
              setPendingEditId(null);
              setPendingViewId(null);
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
        collectionDependencies={[pendingEditId, pendingViewId]}
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
          currentUserId={editCurrentUserId ?? ""}
        />
      )}

      {viewTask && (
        <ViewTaskModal isOpen={!!viewTask} onOpenChange={() => setViewTask(null)} task={viewTask} />
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
