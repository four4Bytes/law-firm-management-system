"use client";

import { useEffect, useState } from "react";
import { Form } from "react-aria-components";

import { Modal } from "@/components/ui/Modal/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge/StatusBadge";
import { getSubtaskRowByIdAction } from "@/features/subtasks/actions";
import type { SubtaskRow } from "@/features/subtasks/queries";
import { UserList } from "@/features/users/components/UserList/UserList";
import { SubtaskStatus } from "@/generated/prisma/browser";
import { formatDate } from "@/lib/date";
import { toastError } from "@/lib/toast-utils";

import styles from "./ViewSubtaskModal.module.css";

const STATUS_LABEL_MAP: Record<SubtaskStatus, string> = {
  [SubtaskStatus.Pending]: "Pending",
  [SubtaskStatus.InProgress]: "In Progress",
  [SubtaskStatus.Completed]: "Completed",
  [SubtaskStatus.Cancelled]: "Cancelled",
};

interface ViewSubtaskModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  subtaskId: string;
}

export function ViewSubtaskModal({ isOpen, onOpenChange, subtaskId }: ViewSubtaskModalProps) {
  const [subtask, setSubtask] = useState<SubtaskRow | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        const result = await getSubtaskRowByIdAction(subtaskId);
        if (cancelled) return;
        if (result.row) {
          setSubtask(result.row);
        } else {
          toastError("Subtask not found", "The requested subtask could not be loaded.");
        }
      } catch {
        if (cancelled) return;
        toastError("Failed to load subtask", "Something went wrong while loading the subtask.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [isOpen, subtaskId]);

  return (
    <>
      <Modal title="Subtask" isOpen={isOpen} onOpenChange={onOpenChange} className={styles.modal}>
        {isLoading ? (
          <div className={styles.loading}>Loading subtask...</div>
        ) : subtask ? (
          <Form className={styles.content}>
            <div className={styles.field}>
              <span className={styles.label}>Title</span>
              <span className={styles.value}>{subtask.title}</span>
            </div>
            {subtask.description && (
              <div className={styles.field}>
                <span className={styles.label}>Description</span>
                <span className={styles.value}>{subtask.description}</span>
              </div>
            )}
            <div className={styles.field}>
              <span className={styles.label}>Status</span>
              <StatusBadge variant="info">{STATUS_LABEL_MAP[subtask.status]}</StatusBadge>
            </div>
            {subtask.priority && (
              <div className={styles.field}>
                <span className={styles.label}>Priority</span>
                <span className={styles.value}>{subtask.priority}</span>
              </div>
            )}
            <div className={styles.field}>
              <span className={styles.label}>Assignees</span>
              <UserList users={subtask.assignees} />
            </div>
            {subtask.due_date ? (
              <div className={styles.field}>
                <span className={styles.label}>Due Date</span>
                <span className={styles.value}>{formatDate(subtask.due_date)}</span>
              </div>
            ) : (
              <div className={styles.field}>
                <span className={styles.label}>Due Date</span>
                <span className={styles.value}>No due date</span>
              </div>
            )}
            <div className={styles.field}>
              <span className={styles.label}>Created At</span>
              <span className={styles.value}>{formatDate(subtask.created_at)}</span>
            </div>
          </Form>
        ) : null}
      </Modal>
    </>
  );
}
