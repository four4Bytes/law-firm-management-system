"use client";

import { useCallback, useEffect, useState } from "react";
import { FaPenToSquare, FaPlus, FaRegSquare, FaSquareCheck, FaTrashCan } from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog/ConfirmDialog";
import { StatusBadge, type StatusBadgeVariant } from "@/components/ui/StatusBadge/StatusBadge";
import {
  deleteSubtaskAction,
  getSubtasksByTaskAction,
  setSubtaskStatusAction,
} from "@/features/subtasks/actions";
import { AddSubtaskModal } from "@/features/subtasks/components/AddSubtaskModal/AddSubtaskModal";
import { EditSubtaskModal } from "@/features/subtasks/components/EditSubtaskModal/EditSubtaskModal";
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
    try {
      const result = await setSubtaskStatusAction({ subtaskId: subtask.id, status: nextStatus });
      if (!result.success) {
        toastActionError(result, "update subtask status");
        return;
      }
      handleRefresh();
    } catch {
      toastError(
        "Failed to update subtask",
        "Something went wrong while updating the subtask. Please try again.",
      );
    } finally {
      setTogglingId(null);
    }
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

      {progress.total > 0 && (
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
          {progress.completed === progress.total && (
            <span className={styles.allDone}>All subtasks completed</span>
          )}
        </div>
      )}

      {isLoading ? (
        <span className={styles.empty}>Loading subtasks...</span>
      ) : rows.length === 0 ? (
        <span className={styles.empty}>No subtasks yet</span>
      ) : (
        <ul className={styles.list}>
          {rows.map((subtask) => {
            const isDone = subtask.status === SubtaskStatus.Completed;
            return (
              <li key={subtask.id} className={styles.row}>
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
                <div className={styles.details}>
                  <span className={styles.title}>{subtask.title}</span>
                  <span className={styles.meta}>
                    Assigned to: {subtask.assignees.map((a) => a.name).join(", ") || "Unassigned"}
                  </span>
                  {subtask.due_date && (
                    <span className={styles.meta}>Due: {formatDate(subtask.due_date)}</span>
                  )}
                  {subtask.priority && (
                    <span className={styles.meta}>Priority: {subtask.priority}</span>
                  )}
                </div>
                <StatusBadge variant={statusVariantMap[subtask.status]}>
                  {statusLabelMap[subtask.status]}
                </StatusBadge>
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
          onSuccess={handleRefresh}
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
