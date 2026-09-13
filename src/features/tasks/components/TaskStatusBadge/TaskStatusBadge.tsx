"use client";

import { StatusBadge } from "@/components/ui/StatusBadge/StatusBadge";
import {
  getTaskStatusHint,
  getTaskStatusLabel,
  getTaskStatusVariant,
  type TaskStatusHintInput,
} from "@/features/tasks/display";
import { TaskStatus } from "@/generated/prisma/browser";

import styles from "./TaskStatusBadge.module.css";

export interface TaskStatusBadgeProps {
  status: TaskStatus;
  hint?: string;
  taskForHint?: TaskStatusHintInput;
}

export function TaskStatusBadge({ status, hint, taskForHint }: TaskStatusBadgeProps) {
  const resolvedHint = hint ?? (taskForHint ? getTaskStatusHint(taskForHint) : undefined);
  return (
    <>
      <StatusBadge variant={getTaskStatusVariant(status)}>{getTaskStatusLabel(status)}</StatusBadge>
      {resolvedHint && <span className={styles.helpText}>{resolvedHint}</span>}
    </>
  );
}
