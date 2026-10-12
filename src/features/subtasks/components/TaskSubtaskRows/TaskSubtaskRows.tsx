"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";
import { FaCircleCheck, FaPenToSquare, FaPlus, FaRegCircle, FaTrashCan } from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog/ConfirmDialog";
import { Tooltip, TooltipTrigger } from "@/components/ui/Tooltip/Tooltip";
import { AddSubtaskModal } from "@/features/subtasks/components/AddSubtaskModal/AddSubtaskModal";
import { EditSubtaskModal } from "@/features/subtasks/components/EditSubtaskModal/EditSubtaskModal";
import type { SubtaskDetailRow, SubtaskRow } from "@/features/subtasks/queries";
import { getTaskDetailRowByIdAction } from "@/features/tasks/actions";
import type { UserSummary } from "@/features/users/types";
import { SubtaskStatus } from "@/generated/prisma/browser";

import styles from "./TaskSubtaskRows.module.css";

export interface SubtaskChildRow {
  id: string;
  kind: "subtask";
  taskId: string;
  subtaskId: string;
  title: string;
  status: SubtaskStatus;
  due_date: Date;
  assignTo: string;
  reviewers: string;
  updated_at: Date;
  created_at: Date;
}

export interface SubtaskChildRowPayload {
  taskId: string;
  subtask: SubtaskRow;
  parentReviewers: string;
}

export function toSubtaskChildRow(payload: SubtaskChildRowPayload): SubtaskChildRow {
  const { taskId, subtask, parentReviewers } = payload;
  return {
    id: `${taskId}:${subtask.id}`,
    kind: "subtask",
    taskId,
    subtaskId: subtask.id,
    title: subtask.title,
    status: subtask.status,
    due_date: subtask.due_date,
    assignTo: subtask.assignTo,
    reviewers: parentReviewers.trim() === "" ? "–" : parentReviewers,
    updated_at: subtask.created_at,
    created_at: subtask.created_at,
  };
}

export interface ChildRowsPayload {
  taskId: string;
  subtasks: SubtaskRow[] | undefined;
  parentReviewers: string;
}

export function childRowsForTask(payload: ChildRowsPayload): SubtaskChildRow[] | null {
  const { taskId, subtasks, parentReviewers } = payload;
  if (subtasks === undefined) return null;
  return subtasks.map((subtask) => toSubtaskChildRow({ taskId, subtask, parentReviewers }));
}

export interface SubtaskCountPillProps {
  count: number;
  className?: string;
}

export function SubtaskCountPill({ count, className }: SubtaskCountPillProps) {
  if (count <= 0) return null;
  return (
    <span className={clsx(styles.countPill, className)}>
      {`${count} subtask${count === 1 ? "" : "s"}`}
    </span>
  );
}

export interface SubtaskTitleCellProps {
  title: string;
  status: SubtaskStatus;
  className?: string;
}

export function SubtaskTitleCell({ title, status, className }: SubtaskTitleCellProps) {
  const isDone = status === SubtaskStatus.Done;
  return (
    <span className={clsx(styles.subtaskTitle, className)}>
      {isDone ? (
        <FaCircleCheck aria-hidden className={styles.marker} />
      ) : (
        <FaRegCircle aria-hidden className={styles.marker} />
      )}
      <span className={clsx(styles.titleText, isDone && styles.doneTitle)}>{title}</span>
    </span>
  );
}

export interface SubtaskRowActionsProps {
  subtaskId: string;
  onEdit: (subtaskId: string) => void;
  onDelete: (subtaskId: string) => void;
  className?: string;
}

export function SubtaskRowActions({
  subtaskId,
  onEdit,
  onDelete,
  className,
}: SubtaskRowActionsProps) {
  return (
    <div className={clsx(styles.actions, className)}>
      <TooltipTrigger>
        <Button variant="ghost" aria-label="Edit subtask" onPress={() => onEdit(subtaskId)}>
          <FaPenToSquare className={styles.icon} />
        </Button>
        <Tooltip>Edit subtask</Tooltip>
      </TooltipTrigger>
      <TooltipTrigger>
        <Button variant="ghost" aria-label="Delete subtask" onPress={() => onDelete(subtaskId)}>
          <FaTrashCan className={styles.icon} />
        </Button>
        <Tooltip>Delete subtask</Tooltip>
      </TooltipTrigger>
    </div>
  );
}

export interface SubtaskExpandedContentProps {
  taskId: string;
  subtasks: SubtaskRow[] | undefined;
  canAdd: boolean;
  onAdd: (taskId: string) => void;
  className?: string;
}

export function SubtaskExpandedContent({
  taskId,
  subtasks,
  canAdd,
  onAdd,
  className,
}: SubtaskExpandedContentProps) {
  return (
    <div className={clsx(styles.expandedContent, className)}>
      {subtasks === undefined ? (
        <span className={styles.emptyMessage}>Loading subtasks...</span>
      ) : (
        <>
          {subtasks.length === 0 && <span className={styles.emptyMessage}>No subtasks yet</span>}
          {canAdd && (
            <Button
              variant="secondary"
              aria-label="Add subtask"
              onPress={() => onAdd(taskId)}
              className={styles.addButton}
            >
              <FaPlus /> Add subtask
            </Button>
          )}
        </>
      )}
    </div>
  );
}

export interface SubtaskDeleteTarget {
  taskId: string;
  row: SubtaskRow;
}

export interface TaskSubtaskRowsProps {
  addTaskId: string | null;
  onAddOpenChange: (open: boolean) => void;
  onAddSuccess: () => void;
  editSubtask: SubtaskDetailRow | null;
  onEditOpenChange: (open: boolean) => void;
  onEditSuccess: () => void;
  deleteTarget: SubtaskDeleteTarget | null;
  onDeleteOpenChange: (open: boolean) => void;
  onDeleteConfirm: () => void;
  users: UserSummary[];
  isLoadingUsers?: boolean;
}

export function TaskSubtaskRows({
  addTaskId,
  onAddOpenChange,
  onAddSuccess,
  editSubtask,
  onEditOpenChange,
  onEditSuccess,
  deleteTarget,
  onDeleteOpenChange,
  onDeleteConfirm,
  users,
  isLoadingUsers = false,
}: TaskSubtaskRowsProps) {
  const [parentTitle, setParentTitle] = useState<string | null>(null);

  useEffect(() => {
    if (!deleteTarget) return;
    const { taskId } = deleteTarget;
    let cancelled = false;

    async function loadParentTitle() {
      try {
        const data = await getTaskDetailRowByIdAction(taskId);
        if (!cancelled) setParentTitle(data.row ? data.row.title : null);
      } catch {
        if (!cancelled) setParentTitle(null);
      }
    }

    void loadParentTitle();

    return () => {
      cancelled = true;
    };
  }, [deleteTarget]);

  return (
    <>
      {addTaskId !== null && (
        <AddSubtaskModal
          isOpen
          onOpenChange={onAddOpenChange}
          onSuccess={onAddSuccess}
          taskId={addTaskId}
          users={users}
          isLoadingUsers={isLoadingUsers}
        />
      )}
      {editSubtask !== null && (
        <EditSubtaskModal
          key={editSubtask.id}
          isOpen
          onOpenChange={onEditOpenChange}
          onSuccess={onEditSuccess}
          subtask={editSubtask}
          users={users}
          isLoadingUsers={isLoadingUsers}
        />
      )}
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onOpenChange={onDeleteOpenChange}
        title="Delete subtask?"
        confirmLabel="Delete subtask"
        cancelVariant="outline"
        confirmVariant="danger"
        onConfirm={onDeleteConfirm}
      >
        {deleteTarget &&
          `"${deleteTarget.row.title}" will be permanently deleted. ${
            parentTitle
              ? `The parent task ${parentTitle} is not changed.`
              : "The parent task is not changed."
          }`}
      </ConfirmDialog>
    </>
  );
}
