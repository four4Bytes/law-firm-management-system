"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FaPenToSquare,
  FaPlus,
  FaRegClipboard,
  FaRegSquare,
  FaSquareCheck,
  FaTrashCan,
} from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog/ConfirmDialog";
import { StatusBadge, type StatusBadgeVariant } from "@/components/ui/StatusBadge/StatusBadge";
import {
  deleteSubtaskAction,
  getSubtasksByTaskAction,
  setSubtaskStatusAction,
} from "@/features/subtasks/actions";
import { AddSubtaskModal } from "@/features/subtasks/components/AddSubtaskModal/AddSubtaskModal";
import {
  EditSubtaskModal,
  type SubtaskEditValues,
} from "@/features/subtasks/components/EditSubtaskModal/EditSubtaskModal";
import type { SubtaskProgress, SubtaskRow } from "@/features/subtasks/queries";
import type { ActiveUserSummary } from "@/features/tasks/queries";
import { SubtaskStatus } from "@/generated/prisma/browser";
import { formatDate } from "@/lib/date";
import { toastActionError, toastDenied, toastError, toastSuccess } from "@/lib/toast-utils";

import styles from "./SubtaskList.module.css";

interface SubtaskListProps {
  taskId: string;
  users: ActiveUserSummary[];
  canCreate: boolean;
}

const statusVariantMap: Record<SubtaskStatus, StatusBadgeVariant> = {
  [SubtaskStatus.Pending]: "pending",
  [SubtaskStatus.InProgress]: "info",
  [SubtaskStatus.Completed]: "done",
  [SubtaskStatus.Cancelled]: "cancelled",
};

const statusLabelMap: Record<SubtaskStatus, string> = {
  [SubtaskStatus.Pending]: "Pending",
  [SubtaskStatus.InProgress]: "In Progress",
  [SubtaskStatus.Completed]: "Completed",
  [SubtaskStatus.Cancelled]: "Cancelled",
};

export function SubtaskList({ taskId, users, canCreate }: SubtaskListProps) {
  const [rows, setRows] = useState<SubtaskRow[]>([]);
  const [progress, setProgress] = useState<SubtaskProgress>({ total: 0, completed: 0, percent: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editSubtask, setEditSubtask] = useState<SubtaskRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SubtaskRow | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRefresh = useCallback(() => setRefreshTrigger((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        const data = await getSubtasksByTaskAction(taskId);
        if (cancelled) return;
        setRows(data.rows);
        setProgress(data.progress);
      } catch (error) {
        if (cancelled) return;
        const isForbidden = (error as { digest?: string })?.digest === "FORBIDDEN";
        if (isForbidden) {
          toastDenied();
        } else {
          toastError(
            "Failed to load subtasks",
            "We couldn't load the subtasks for this task. Please try again.",
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [taskId, refreshTrigger]);

  async function handleToggle(subtask: SubtaskRow) {
    if (togglingId) return;
    setTogglingId(subtask.id);
    const nextStatus =
      subtask.status === SubtaskStatus.Completed ? SubtaskStatus.Pending : SubtaskStatus.Completed;

    const previousRows = rows;
    const previousProgress = progress;

    const nextRows = rows.map((row) =>
      row.id === subtask.id ? { ...row, status: nextStatus } : row,
    );
    const nextCompleted = nextRows.filter((row) => row.status === SubtaskStatus.Completed).length;
    const nextTotal = nextRows.length;

    setRows(nextRows);
    setProgress({
      total: nextTotal,
      completed: nextCompleted,
      percent: nextTotal === 0 ? 0 : Math.round((nextCompleted / nextTotal) * 100),
    });

    function revert() {
      setRows(previousRows);
      setProgress(previousProgress);
    }

    try {
      const result = await setSubtaskStatusAction({ subtaskId: subtask.id, status: nextStatus });
      if (!result.success) {
        revert();
        toastActionError(result, "update subtask status");
        return;
      }
    } catch {
      revert();
      toastError(
        "Failed to update subtask",
        "Something went wrong while updating the subtask. Please try again.",
      );
    } finally {
      setTogglingId(null);
    }
  }

  function handleEditSaved(subtaskId: string, values: SubtaskEditValues) {
    const nextRows = rows.map((row) => {
      if (row.id !== subtaskId) return row;
      return {
        ...row,
        title: values.title,
        description: values.description ?? null,
        due_date: values.due_date ?? null,
        status: values.status,
        assignee_ids: values.assignee_ids,
        assignees: values.assignee_ids.map((id) => ({
          id,
          name: users.find((user) => user.id === id)?.name ?? "Unknown",
        })),
      };
    });
    const nextCompleted = nextRows.filter((row) => row.status === SubtaskStatus.Completed).length;

    setRows(nextRows);
    setProgress({
      total: nextRows.length,
      completed: nextCompleted,
      percent: nextRows.length === 0 ? 0 : Math.round((nextCompleted / nextRows.length) * 100),
    });
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const result = await deleteSubtaskAction({ subtaskId: deleteTarget.id });
    if (result.success) {
      setDeleteTarget(null);
      toastSuccess("Subtask deleted", "The subtask has been permanently removed.");
      handleRefresh();
    } else {
      toastActionError(result, "delete subtask");
    }
  }

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <span className={styles.label}>Subtasks</span>
        {canCreate && (
          <Button variant="secondary" type="button" onPress={() => setIsAddOpen(true)}>
            <FaPlus /> Add Subtask
          </Button>
        )}
      </div>

      <div className={styles.progress}>
        <span className={styles.progressText}>
          Subtasks: {progress.completed}/{progress.total} completed
        </span>
        <progress
          className={styles.bar}
          value={progress.completed}
          max={Math.max(progress.total, 1)}
          aria-label="Subtask progress"
        />
        <span className={styles.percent}>{progress.percent}%</span>
      </div>

      {isLoading && rows.length === 0 ? (
        <div className={styles.empty}>
          <FaRegClipboard className={styles.emptyIcon} aria-hidden="true" />
          <span className={styles.emptyTitle}>Loading subtasks...</span>
        </div>
      ) : rows.length === 0 ? (
        <div className={styles.empty}>
          <FaRegClipboard className={styles.emptyIcon} aria-hidden="true" />
          <span className={styles.emptyTitle}>No subtasks recorded</span>
          <span className={styles.emptyHint}>
            Click &quot;+ Add Subtask&quot; to create a new one
          </span>
        </div>
      ) : (
        <ul className={styles.list}>
          {rows.map((subtask) => {
            const isDone = subtask.status === SubtaskStatus.Completed;
            return (
              <li key={subtask.id} className={styles.card}>
                <div className={styles.topRow}>
                  <Button
                    variant="ghost"
                    aria-label={isDone ? "Mark subtask as pending" : "Mark subtask as completed"}
                    onPress={() => handleToggle(subtask)}
                    isDisabled={togglingId === subtask.id}
                    className={styles.toggle}
                  >
                    {isDone ? (
                      <FaSquareCheck className={styles.checkIcon} />
                    ) : (
                      <FaRegSquare className={styles.checkIcon} />
                    )}
                  </Button>
                  <span className={styles.title} title={subtask.title}>
                    {subtask.title}
                  </span>
                  <span className={styles.statusSlot}>
                    <StatusBadge variant={statusVariantMap[subtask.status]}>
                      {statusLabelMap[subtask.status]}
                    </StatusBadge>
                  </span>
                  <div className={styles.actions}>
                    <Button
                      variant="ghost"
                      aria-label="Edit subtask"
                      onPress={() => setEditSubtask(subtask)}
                    >
                      <FaPenToSquare className={styles.icon} />
                    </Button>
                    <Button
                      variant="ghost"
                      aria-label="Delete subtask"
                      onPress={() => setDeleteTarget(subtask)}
                    >
                      <FaTrashCan className={styles.icon} />
                    </Button>
                  </div>
                </div>
                {subtask.description && (
                  <p className={styles.description} title={subtask.description}>
                    {subtask.description}
                  </p>
                )}
                <div className={styles.metaRow}>
                  <span className={styles.metaItem}>
                    Assigned: {subtask.assignees.map((a) => a.name).join(", ") || "Unassigned"}
                  </span>
                  {subtask.due_date ? (
                    <span className={styles.metaItem}>Due: {formatDate(subtask.due_date)}</span>
                  ) : (
                    <span className={styles.metaItem}>No due date</span>
                  )}
                  {subtask.priority && (
                    <span className={styles.priorityBadge}>{subtask.priority}</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AddSubtaskModal
        isOpen={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSuccess={handleRefresh}
        taskId={taskId}
        users={users}
      />

      {editSubtask && (
        <EditSubtaskModal
          key={editSubtask.id}
          isOpen={!!editSubtask}
          onOpenChange={() => setEditSubtask(null)}
          onSaved={handleEditSaved}
          subtask={editSubtask}
          users={users}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete Subtask"
        confirmLabel="Delete"
        onConfirm={handleDelete}
      >
        Are you sure you want to delete this subtask?
      </ConfirmDialog>
    </div>
  );
}
