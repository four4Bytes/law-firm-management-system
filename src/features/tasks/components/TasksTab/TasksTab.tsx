"use client";

import { useCallback, useEffect, useState } from "react";
import { FaEye, FaPenToSquare, FaTrashCan } from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog/ConfirmDialog";
import { type ColumnDef } from "@/components/ui/DataTable/DataTable";
import { ServerDataTable } from "@/components/ui/ServerDataTable/ServerDataTable";
import { StatusBadge } from "@/components/ui/StatusBadge/StatusBadge";
import type { FilterDefinition } from "@/components/ui/TableFilter/TableFilter";
import { Tooltip, TooltipTrigger } from "@/components/ui/Tooltip/Tooltip";
import {
  deleteSubtaskAction,
  getSubtaskCountsByTaskIdsAction,
  getSubtaskDetailAction,
  getSubtasksByTaskAction,
} from "@/features/subtasks/actions";
import {
  childRowsForTask,
  SubtaskCountPill,
  SubtaskExpandedContent,
  SubtaskRowActions,
  SubtaskTitleCell,
  TaskSubtaskRows,
  type SubtaskChildRow,
  type SubtaskDeleteTarget,
} from "@/features/subtasks/components/TaskSubtaskRows/TaskSubtaskRows";
import subtaskStyles from "@/features/subtasks/components/TaskSubtaskRows/TaskSubtaskRows.module.css";
import {
  getSubtaskStatusLabel,
  getSubtaskStatusVariant,
  isSubtaskOverdue,
} from "@/features/subtasks/display";
import type { SubtaskDetailRow, SubtaskRow } from "@/features/subtasks/queries";
import {
  deleteTaskAction,
  getTaskDetailRowByIdAction,
  getTasksPaginatedAction,
  type TaskCapabilities,
} from "@/features/tasks/actions";
import { AddTaskModal } from "@/features/tasks/components/AddTaskModal/AddTaskModal";
import { EditTaskModal } from "@/features/tasks/components/EditTaskModal/EditTaskModal";
import { ViewTaskModal } from "@/features/tasks/components/ViewTaskModal/ViewTaskModal";
import { getTaskStatusLabel, getTaskStatusVariant } from "@/features/tasks/display";
import type { TaskDetailRow, TaskRow } from "@/features/tasks/queries";
import { getActiveUsersAction } from "@/features/users/actions";
import type { UserSummary } from "@/features/users/types";
import { TaskStatus, type Role } from "@/generated/prisma/browser";
import {
  toastActionError,
  toastDenied,
  toastError,
  toastNotFound,
  toastSuccess,
} from "@/lib/hooks/toast-utils";
import { usePendingFetch } from "@/lib/hooks/usePendingFetch";
import { formatDateTime, isBeforeToday } from "@/lib/primitives/date";
import type { FilterValues, SortQuery } from "@/lib/primitives/types";
import { isForbiddenError } from "@/lib/security/errors";
import { can, type AccessContext } from "@/lib/security/rbac";

import styles from "./TasksTab.module.css";

interface Props {
  caseId: string;
  access: AccessContext;
  userRole: Role | null;
  currentUserId: string | null;
}

const taskFilters: FilterDefinition[] = [
  {
    key: "status",
    label: "Status",
    options: Object.values(TaskStatus).map((status) => ({
      value: status,
      label: getTaskStatusLabel(status),
    })),
  },
];

export type TaskTableRow = ({ kind: "task" } & TaskRow) | ({ kind: "subtask" } & SubtaskChildRow);

export function TasksTab({ caseId, access, userRole, currentUserId }: Props) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editTask, setEditTask] = useState<TaskDetailRow | null>(null);
  const [editCapabilities, setEditCapabilities] = useState<TaskCapabilities | null>(null);
  const [editCurrentUserId, setEditCurrentUserId] = useState<string | null>(null);
  const [viewTask, setViewTask] = useState<TaskDetailRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TaskRow | null>(null);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [subtaskCache, setSubtaskCache] = useState<Record<string, SubtaskRow[] | undefined>>({});
  const [addSubtaskTaskId, setAddSubtaskTaskId] = useState<string | null>(null);
  const [editSubtask, setEditSubtask] = useState<SubtaskDetailRow | null>(null);
  const [subtaskDeleteTarget, setSubtaskDeleteTarget] = useState<SubtaskDeleteTarget | null>(null);
  const { pendingId: pendingEditId, run: runEditFetch, clear: clearEditFetch } = usePendingFetch();
  const { pendingId: pendingViewId, run: runViewFetch, clear: clearViewFetch } = usePendingFetch();

  const canCreate = can(userRole, "task.create", access);

  const handleRefresh = useCallback(() => setRefreshTrigger((n) => n + 1), []);

  const fetchTasksWithCounts = useCallback(
    async (params: {
      search?: string;
      cursor?: string;
      pageSize?: number;
      sort?: SortQuery;
      filters?: FilterValues;
    }) => {
      const result = await getTasksPaginatedAction({ caseId, ...params });
      const taskIds = result.rows.map((row) => row.id);
      if (taskIds.length > 0) {
        try {
          const pageCounts = await getSubtaskCountsByTaskIdsAction({ caseId, taskIds });
          setCounts((prev) => ({
            ...prev,
            ...Object.fromEntries(taskIds.map((id) => [id, 0])),
            ...pageCounts,
          }));
        } catch {
          toastError(
            "Failed to load subtask counts",
            "Subtask counts could not be loaded. Expand a task to see its subtasks.",
          );
        }
      }
      return {
        rows: result.rows.map((row): TaskTableRow => ({ kind: "task", ...row })),
        nextCursor: result.nextCursor,
      };
    },
    [caseId],
  );

  async function refreshSubtasks(taskId: string) {
    try {
      const rows = await getSubtasksByTaskAction({ taskId });
      setSubtaskCache((prev) => ({ ...prev, [taskId]: rows }));
    } catch {
      toastError(
        "Failed to load subtasks",
        "We couldn't reload the subtasks for this task. Please try again.",
      );
    }
    handleRefresh();
  }

  async function handleExpandedChange(keys: Set<string>) {
    setExpanded(keys);
    for (const taskId of keys) {
      if (subtaskCache[taskId] !== undefined) continue;
      try {
        const rows = await getSubtasksByTaskAction({ taskId });
        setSubtaskCache((prev) =>
          prev[taskId] === undefined ? { ...prev, [taskId]: rows } : prev,
        );
      } catch {
        toastError(
          "Failed to load subtasks",
          "We couldn't load the subtasks for this task. Please try again.",
        );
      }
    }
  }

  const getChildRows = useCallback(
    (row: TaskTableRow): TaskTableRow[] | null => {
      if (row.kind !== "task") return null;
      return childRowsForTask({ taskId: row.id, subtasks: subtaskCache[row.id] });
    },
    [subtaskCache],
  );

  const renderExpandedContent = useCallback(
    (row: TaskTableRow) => {
      if (row.kind !== "task") return null;
      return (
        <SubtaskExpandedContent
          taskId={row.id}
          subtasks={subtaskCache[row.id]}
          canAdd={canCreate}
          onAdd={(taskId) => setAddSubtaskTaskId(taskId)}
        />
      );
    },
    [subtaskCache, canCreate],
  );

  async function handleSubtaskEdit(subtaskId: string) {
    try {
      const detail = await getSubtaskDetailAction({ subtaskId });
      if (!detail) {
        toastNotFound("Subtask");
        return;
      }
      setEditSubtask(detail);
    } catch (error) {
      if (isForbiddenError(error)) {
        toastDenied();
      } else {
        toastError(
          "Failed to load subtask",
          "Something went wrong while loading this subtask. Please try again.",
        );
      }
    }
  }

  function handleSubtaskDeleteAsk(subtaskId: string) {
    for (const taskId of Object.keys(subtaskCache)) {
      const row = subtaskCache[taskId]?.find((candidate) => candidate.id === subtaskId);
      if (row) {
        setSubtaskDeleteTarget({ taskId, row });
        return;
      }
    }
  }

  async function handleSubtaskDelete() {
    if (!subtaskDeleteTarget) return;
    const result = await deleteSubtaskAction({ subtaskId: subtaskDeleteTarget.row.id });
    if (result.success) {
      const taskId = subtaskDeleteTarget.taskId;
      setSubtaskDeleteTarget(null);
      await refreshSubtasks(taskId);
      toastSuccess("Subtask deleted", "The subtask has been permanently removed.");
    } else {
      toastActionError(result, "delete subtask");
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadAssignees() {
      setIsLoadingUsers(true);
      try {
        const usersData = await getActiveUsersAction();
        if (cancelled) return;
        setUsers(usersData);
      } catch {
        if (cancelled) return;
        toastError("Failed to load assignees", "We couldn't load the user list. Please try again.");
      } finally {
        if (!cancelled) setIsLoadingUsers(false);
      }
    }

    void loadAssignees();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleView(task: TaskRow) {
    try {
      const data = await runViewFetch(task.id, () => getTaskDetailRowByIdAction(task.id));
      if (!data) return;
      if (!data.row) {
        toastNotFound("Task");
        return;
      }
      setViewTask(data.row);
    } catch (error) {
      if (isForbiddenError(error)) {
        toastDenied();
      } else {
        toastError(
          "Failed to load task",
          "Something went wrong while loading this task. Please try again.",
        );
      }
    }
  }

  async function handleEdit(task: TaskRow) {
    try {
      const data = await runEditFetch(task.id, () => getTaskDetailRowByIdAction(task.id));
      if (!data) return;
      if (!data.row) {
        toastNotFound("Task");
        return;
      }
      const c = data.capabilities;
      if (c.canEdit || c.canReview || c.canManageReviewers || c.canSubmit) {
        setEditTask(data.row);
        setEditCapabilities(data.capabilities);
        setEditCurrentUserId(data.currentUserId);
      } else {
        toastDenied();
      }
    } catch (error) {
      if (isForbiddenError(error)) {
        toastDenied();
      } else {
        toastError(
          "Failed to load task",
          "Something went wrong while loading this task. Please try again.",
        );
      }
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

  const columns: ColumnDef<TaskTableRow>[] = [
    {
      id: "title",
      name: "Title",
      isRowHeader: true,
      allowsSorting: true,
      render: (_value, row) => {
        if (row.kind === "subtask") return <SubtaskTitleCell title={row.title} />;
        return (
          <span className={subtaskStyles.titleCell}>
            <span className={subtaskStyles.titleText}>{row.title}</span>
            <SubtaskCountPill count={counts[row.id] ?? 0} />
          </span>
        );
      },
    },
    {
      id: "status",
      name: "Status",
      allowsSorting: true,
      render: (_value, row) => {
        if (row.kind === "subtask") {
          return (
            <StatusBadge variant={getSubtaskStatusVariant(row.status)}>
              {getSubtaskStatusLabel(row.status)}
            </StatusBadge>
          );
        }
        return (
          <StatusBadge variant={getTaskStatusVariant(row.status)}>
            {getTaskStatusLabel(row.status)}
          </StatusBadge>
        );
      },
    },
    {
      id: "due_date",
      name: "Due Date",
      allowsSorting: true,
      render: (_value, row) => {
        if (row.kind === "subtask") {
          const overdue = isSubtaskOverdue({ due_date: row.due_date, status: row.status });
          return (
            <span className={styles.dateCell}>
              {formatDateTime(row.due_date)}
              {overdue && <span className={styles.overdue}>Overdue</span>}
            </span>
          );
        }
        if (!row.due_date) return "—";
        const isOverdue = row.status !== TaskStatus.Done && isBeforeToday(row.due_date);
        return (
          <span className={styles.dateCell}>
            {formatDateTime(row.due_date)}
            {isOverdue && <span className={styles.overdue}>Overdue</span>}
          </span>
        );
      },
    },
    { id: "assignTo", name: "Assigned To" },
    { id: "reviewers", name: "Reviewers" },
  ];

  const actionColumn: ColumnDef<TaskTableRow> = {
    id: "id" as const,
    name: "Action" as const,
    render: (_value: unknown, row: unknown) => {
      const tableRow = row as TaskTableRow;
      if (tableRow.kind === "subtask") {
        return (
          <SubtaskRowActions
            subtaskId={tableRow.subtaskId}
            onEdit={handleSubtaskEdit}
            onDelete={handleSubtaskDeleteAsk}
          />
        );
      }
      const task = tableRow;
      return (
        <div className={styles.actions}>
          <TooltipTrigger>
            <Button
              variant="ghost"
              aria-label="View task"
              onPress={() => handleView(task)}
              isPending={pendingViewId === task.id}
            >
              <FaEye className={styles.icon} />
            </Button>
            <Tooltip>View task</Tooltip>
          </TooltipTrigger>
          <TooltipTrigger>
            <Button
              variant="ghost"
              aria-label="Edit task"
              onPress={() => handleEdit(task)}
              isPending={pendingEditId === task.id}
            >
              <FaPenToSquare className={styles.icon} />
            </Button>
            <Tooltip>Edit task</Tooltip>
          </TooltipTrigger>
          <TooltipTrigger>
            <Button
              variant="ghost"
              aria-label="Delete task"
              onPress={() => {
                clearEditFetch();
                clearViewFetch();
                setDeleteTarget(task);
              }}
            >
              <FaTrashCan className={styles.icon} />
            </Button>
            <Tooltip>Delete task</Tooltip>
          </TooltipTrigger>
        </div>
      );
    },
  };

  return (
    <>
      <ServerDataTable
        fetchAction={fetchTasksWithCounts}
        columns={[...columns, actionColumn]}
        searchPlaceholder="Search tasks..."
        emptyContent="No tasks yet"
        loadingMessage="Loading tasks..."
        searchLabel="Search tasks"
        filters={taskFilters}
        selectionMode="none"
        collectionDependencies={[pendingEditId, pendingViewId, expanded, subtaskCache, counts]}
        renderAddButton={canCreate}
        addButtonLabel="Add Task"
        onAddButtonPress={() => setIsAddOpen(true)}
        refreshTrigger={refreshTrigger}
        expandedKeys={expanded}
        onExpandedChange={handleExpandedChange}
        getChildRows={getChildRows}
        renderExpandedContent={renderExpandedContent}
        expandAriaLabel={(row) => `Expand subtasks for ${row.title}`}
        expandOnRowClick
      />

      <TaskSubtaskRows
        addTaskId={addSubtaskTaskId}
        onAddOpenChange={(open) => {
          if (!open) setAddSubtaskTaskId(null);
        }}
        onAddSuccess={() => {
          if (addSubtaskTaskId !== null) void refreshSubtasks(addSubtaskTaskId);
        }}
        editSubtask={editSubtask}
        onEditOpenChange={(open) => {
          if (!open) setEditSubtask(null);
        }}
        onEditSuccess={() => {
          if (editSubtask !== null) void refreshSubtasks(editSubtask.task_id);
        }}
        deleteTarget={subtaskDeleteTarget}
        onDeleteOpenChange={(open) => {
          if (!open) setSubtaskDeleteTarget(null);
        }}
        onDeleteConfirm={handleSubtaskDelete}
        users={users}
        isLoadingUsers={isLoadingUsers}
      />

      <AddTaskModal
        isOpen={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSuccess={handleRefresh}
        caseId={caseId}
        users={users}
        currentUserId={currentUserId}
        isLoading={isLoadingUsers}
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
