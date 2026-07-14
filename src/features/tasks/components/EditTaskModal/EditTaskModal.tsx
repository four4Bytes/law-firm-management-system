"use client";

import { useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/Button/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog/ConfirmDialog";
import { Modal } from "@/components/ui/Modal/Modal";
import { ProgressCircle } from "@/components/ui/ProgressCircle/ProgressCircle";
import { Select, SelectItem } from "@/components/ui/Select/Select";
import { TextField } from "@/components/ui/TextField/TextField";
import { queue } from "@/components/ui/Toast/Toast";
import { deleteTaskAction, updateTaskAction } from "@/features/tasks/actions";
import type { ActiveUserSummary, TaskDetailRow } from "@/features/tasks/queries";
import { TaskUpdatePayloadSchema } from "@/features/tasks/schemas";
import { TaskStatus } from "@/generated/prisma/browser";
import { useModalForm } from "@/lib/useModalForm";

import styles from "./EditTaskModal.module.css";

const STATUS_OPTIONS = Object.values(TaskStatus);

interface EditTaskModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void;
  task: TaskDetailRow;
  users: ActiveUserSummary[];
}

export function EditTaskModal({
  isOpen,
  onOpenChange,
  onSuccess,
  task,
  users,
}: EditTaskModalProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(task.status as TaskStatus);
  const [assigneeIds, setAssigneeIds] = useState<Set<string>>(new Set(task.assignee_ids));

  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { isPending, submitForm } = useModalForm<z.input<typeof TaskUpdatePayloadSchema>>({
    submit: updateTaskAction,
    onOpenChange,
    onSuccess,
    successMessage: "Task updated",
    failureMessage: "Failed to update task",
  });

  function handleDismiss() {
    if (isPending || isDeleting) return;
    onOpenChange(false);
  }

  async function handleSave() {
    if (!title.trim()) return;

    await submitForm({
      taskId: task.id,
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      assignee_ids: Array.from(assigneeIds),
    });
  }

  async function handleDelete() {
    setIsDeleting(true);

    try {
      const result = await deleteTaskAction({ taskId: task.id });

      setShowDeleteConfirm(false);

      if (result.success) {
        queue.add({ title: "Task deleted" }, { timeout: 5000 });
        onOpenChange(false);
        onSuccess();
      } else {
        queue.add({ title: result.error ?? "Failed to delete task" }, { timeout: 5000 });
      }
    } catch {
      queue.add({ title: "Failed to delete task" }, { timeout: 5000 });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  const hasChanges =
    title.trim() !== task.title ||
    description.trim() !== (task.description ?? "") ||
    status !== (task.status as TaskStatus) ||
    !areSetsEqual(assigneeIds, new Set(task.assignee_ids));

  const isValid = title.trim().length > 0;

  return (
    <>
      <Modal
        title="Edit Task"
        isOpen={isOpen}
        onOpenChange={handleDismiss}
        className={styles.modal}
      >
        <div className={styles.content}>
          <TextField
            label="Title"
            value={title}
            onChange={setTitle}
            placeholder="Enter task title..."
            isDisabled={isPending || isDeleting}
          />
          <TextField
            label="Description"
            isTextArea
            rows={3}
            value={description}
            onChange={setDescription}
            placeholder="Optional description..."
            isDisabled={isPending || isDeleting}
          />
          <Select
            label="Status"
            value={status}
            onChange={(k) => setStatus(String(k) as TaskStatus)}
            isDisabled={isPending || isDeleting}
          >
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} id={s}>
                {s}
              </SelectItem>
            ))}
          </Select>
          <Select
            label="Assignees"
            selectionMode="multiple"
            value={Array.from(assigneeIds)}
            onChange={(keys) => setAssigneeIds(new Set(keys.map(String)))}
            placeholder="Select assignees..."
            items={users}
            isDisabled={isPending || isDeleting}
          >
            {(user) => <SelectItem id={user.id}>{user.name}</SelectItem>}
          </Select>
          {assigneeIds.size > 0 && (
            <ul className={styles.selectedAssignees}>
              {users
                .filter((u) => assigneeIds.has(u.id))
                .map((u) => (
                  <li key={u.id} className={styles.selectedAssignee}>
                    {u.name}
                  </li>
                ))}
            </ul>
          )}
          <div className={styles.actions}>
            <Button
              variant="secondary"
              onPress={handleSave}
              isDisabled={!isValid || !hasChanges || isPending || isDeleting}
              isPending={isPending}
            >
              Save
            </Button>
            <Button onPress={() => setShowDeleteConfirm(true)} isDisabled={isPending || isDeleting}>
              {isDeleting ? <ProgressCircle aria-label="Deleting" /> : "Delete"}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Task"
        confirmLabel="Delete"
        onConfirm={handleDelete}
      >
        Are you sure you want to delete this task? This action cannot be undone.
      </ConfirmDialog>
    </>
  );
}

function areSetsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const item of a) {
    if (!b.has(item)) return false;
  }
  return true;
}
