"use client";

import clsx from "clsx";
import { FaPenToSquare, FaPlus, FaRegCircle, FaTrashCan } from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog/ConfirmDialog";
import { Tooltip, TooltipTrigger } from "@/components/ui/Tooltip/Tooltip";
import { AddSubtaskModal } from "@/features/subtasks/components/AddSubtaskModal/AddSubtaskModal";
import { EditSubtaskModal } from "@/features/subtasks/components/EditSubtaskModal/EditSubtaskModal";
import type { SubtaskDetailRow, SubtaskRow } from "@/features/subtasks/queries";
import type { UserSummary } from "@/features/users/types";
import type { SubtaskStatus } from "@/generated/prisma/browser";

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
}

export function toSubtaskChildRow(payload: SubtaskChildRowPayload): SubtaskChildRow {
  const { taskId, subtask } = payload;
  return {
    id: `${taskId}:${subtask.id}`,
    kind: "subtask",
    taskId,
    subtaskId: subtask.id,
    title: subtask.title,
    status: subtask.status,
    due_date: subtask.due_date,
    assignTo: subtask.assignTo,
    reviewers: "–",
    updated_at: subtask.created_at,
    created_at: subtask.created_at,
  };
}

export interface ChildRowsPayload {
  taskId: string;
  subtasks: SubtaskRow[] | undefined;
}

export function childRowsForTask(payload: ChildRowsPayload): SubtaskChildRow[] | null {
  const { taskId, subtasks } = payload;
  if (subtasks === undefined) return null;
  return subtasks.map((subtask) => toSubtaskChildRow({ taskId, subtask }));
}

export interface SubtaskCountPillProps {
  count: number;
  className?: string;
}

export function SubtaskCountPill({ count, className }: SubtaskCountPillProps) {
  if (count > 0) {
    return (
      <span className={clsx(styles.countPill, className)}>
        {`${count} subtask${count === 1 ? "" : "s"}`}
      </span>
    );
  }
  return <span className={clsx(styles.emptyPill, className)}>No subtasks yet</span>;
}

export interface SubtaskTitleCellProps {
  title: string;
  className?: string;
}

export function SubtaskTitleCell({ title, className }: SubtaskTitleCellProps) {
  return (
    <span className={clsx(styles.subtaskTitle, className)}>
      <FaRegCircle aria-hidden className={styles.marker} />
      {title}
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
            <Button variant="secondary" aria-label="Add subtask" onPress={() => onAdd(taskId)}>
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
        title="Delete Subtask"
        confirmLabel="Delete"
        onConfirm={onDeleteConfirm}
      >
        Are you sure you want to delete this subtask? This removes only this subtask. The parent
        task is unaffected.
      </ConfirmDialog>
    </>
  );
}
