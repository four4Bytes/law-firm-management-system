"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";
import { FaCheck, FaEye, FaPenToSquare, FaPlus, FaTrashCan } from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog/ConfirmDialog";
import { StatusBadge } from "@/components/ui/StatusBadge/StatusBadge";
import { Tooltip, TooltipTrigger } from "@/components/ui/Tooltip/Tooltip";
import {
  completeSubtaskAction,
  deleteSubtaskAction,
  getSubtaskDetailAction,
  getSubtasksByTaskAction,
} from "@/features/subtasks/actions";
import { AddSubtaskModal } from "@/features/subtasks/components/AddSubtaskModal/AddSubtaskModal";
import { EditSubtaskModal } from "@/features/subtasks/components/EditSubtaskModal/EditSubtaskModal";
import {
  getSubtaskStatusLabel,
  getSubtaskStatusVariant,
  isSubtaskOverdue,
} from "@/features/subtasks/display";
import type { SubtaskDetailRow, SubtaskRow } from "@/features/subtasks/queries";
import { getActiveUsersAction } from "@/features/users/actions";
import type { UserSummary } from "@/features/users/types";
import { toastActionError, toastError, toastNotFound, toastSuccess } from "@/lib/hooks/toast-utils";
import { formatDateTime } from "@/lib/primitives/date";

import styles from "./SubtasksSection.module.css";

export interface SubtasksSectionProps {
  taskId: string;
  canEdit: boolean;
  caseId?: string;
  initialRows?: SubtaskRow[];
  className?: string;
  onSuccess?: () => void;
}

export function SubtasksSection({
  taskId,
  canEdit,
  initialRows,
  className,
  onSuccess,
}: SubtasksSectionProps) {
  const [rows, setRows] = useState<SubtaskRow[]>(initialRows ?? []);
  const [isLoading, setIsLoading] = useState(initialRows === undefined);
  const [refreshKey, setRefreshKey] = useState(0);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editSubtask, setEditSubtask] = useState<SubtaskDetailRow | null>(null);
  const [editReadOnly, setEditReadOnly] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SubtaskRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        const data = await getSubtasksByTaskAction({ taskId });
        if (!cancelled) setRows(data);
      } catch {
        if (!cancelled) {
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
  }, [taskId, refreshKey]);

  useEffect(() => {
    let cancelled = false;

    async function loadAssignees() {
      setIsLoadingUsers(true);
      try {
        const usersData = await getActiveUsersAction();
        if (!cancelled) setUsers(usersData);
      } catch {
        if (!cancelled) {
          toastError(
            "Failed to load assignees",
            "We couldn't load the user list. Please try again.",
          );
        }
      } finally {
        if (!cancelled) setIsLoadingUsers(false);
      }
    }

    void loadAssignees();

    return () => {
      cancelled = true;
    };
  }, []);

  function reload() {
    setRefreshKey((n) => n + 1);
  }

  async function handleOpenDetail(row: SubtaskRow, readOnly: boolean) {
    if (busyId) return;
    setBusyId(row.id);
    try {
      const detail = await getSubtaskDetailAction({ subtaskId: row.id });
      if (!detail) {
        toastNotFound("Subtask");
        return;
      }
      setEditReadOnly(readOnly || !canEdit);
      setEditSubtask(detail);
    } catch {
      toastError(
        "Failed to load subtask",
        "Something went wrong while loading this subtask. Please try again.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleComplete(row: SubtaskRow) {
    if (busyId) return;
    setBusyId(row.id);
    try {
      const result = await completeSubtaskAction({ subtaskId: row.id });
      if (result.success) {
        toastSuccess("Subtask completed", "The subtask has been marked as done.");
        reload();
        onSuccess?.();
      } else {
        toastActionError(result, "complete subtask");
      }
    } catch {
      toastError(
        "Unexpected error",
        "Something went wrong while completing the subtask. Please try again.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const result = await deleteSubtaskAction({ subtaskId: deleteTarget.id });
    if (result.success) {
      setDeleteTarget(null);
      reload();
      onSuccess?.();
      toastSuccess("Subtask deleted", "The subtask has been permanently removed.");
    } else {
      toastActionError(result, "delete subtask");
    }
  }

  return (
    <div className={clsx(styles.section, className)}>
      <div className={styles.header}>
        <span className={styles.label}>Subtasks</span>
        {canEdit && (
          <Button variant="secondary" type="button" onPress={() => setIsAddOpen(true)}>
            <FaPlus /> Add Subtask
          </Button>
        )}
      </div>
      {isLoading ? (
        <span className={styles.empty}>Loading subtasks...</span>
      ) : rows.length === 0 ? (
        <span className={styles.empty}>No subtasks yet</span>
      ) : (
        <ul className={styles.rows}>
          {rows.map((row) => {
            const overdue = isSubtaskOverdue({ due_date: row.due_date, status: row.status });
            const busy = busyId === row.id;
            return (
              <li key={row.id} className={styles.row}>
                <div className={styles.main}>
                  <span className={styles.title}>{row.title}</span>
                  <StatusBadge variant={getSubtaskStatusVariant(row.status)}>
                    {getSubtaskStatusLabel(row.status)}
                  </StatusBadge>
                </div>
                <div className={styles.meta}>
                  <span className={styles.assignees}>{row.assignTo}</span>
                  <span className={styles.dateCell}>
                    {formatDateTime(row.due_date)}
                    {overdue && <span className={styles.overdue}>Overdue</span>}
                  </span>
                </div>
                <div className={styles.actions}>
                  <TooltipTrigger>
                    <Button
                      variant="ghost"
                      aria-label="View subtask"
                      onPress={() => handleOpenDetail(row, true)}
                      isDisabled={busy}
                    >
                      <FaEye className={styles.icon} />
                    </Button>
                    <Tooltip>View subtask</Tooltip>
                  </TooltipTrigger>
                  <TooltipTrigger>
                    <Button
                      variant="ghost"
                      aria-label="Edit subtask"
                      onPress={() => handleOpenDetail(row, false)}
                      isDisabled={busy}
                    >
                      <FaPenToSquare className={styles.icon} />
                    </Button>
                    <Tooltip>Edit subtask</Tooltip>
                  </TooltipTrigger>
                  <TooltipTrigger>
                    <Button
                      variant="ghost"
                      aria-label="Complete subtask"
                      onPress={() => handleComplete(row)}
                      isDisabled={busy}
                    >
                      <FaCheck className={styles.icon} />
                    </Button>
                    <Tooltip>Complete subtask</Tooltip>
                  </TooltipTrigger>
                  <TooltipTrigger>
                    <Button
                      variant="ghost"
                      aria-label="Delete subtask"
                      onPress={() => setDeleteTarget(row)}
                      isDisabled={busy}
                    >
                      <FaTrashCan className={styles.icon} />
                    </Button>
                    <Tooltip>Delete subtask</Tooltip>
                  </TooltipTrigger>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {canEdit && (
        <AddSubtaskModal
          isOpen={isAddOpen}
          onOpenChange={setIsAddOpen}
          onSuccess={() => {
            reload();
            onSuccess?.();
          }}
          taskId={taskId}
          users={users}
          isLoadingUsers={isLoadingUsers}
        />
      )}

      {editSubtask && (
        <EditSubtaskModal
          key={editSubtask.id}
          isOpen={!!editSubtask}
          onOpenChange={() => setEditSubtask(null)}
          onSuccess={() => {
            reload();
            onSuccess?.();
          }}
          subtask={editSubtask}
          readOnly={editReadOnly}
          users={users}
          isLoadingUsers={isLoadingUsers}
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
        Are you sure you want to delete this subtask? This removes only this subtask. The parent
        task is unaffected.
      </ConfirmDialog>
    </div>
  );
}
