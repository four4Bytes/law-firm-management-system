"use client";

import { useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";
import { Select, SelectItem } from "@/components/ui/Select/Select";
import { TextField } from "@/components/ui/TextField/TextField";
import { createTaskAction } from "@/features/tasks/actions";
import type { ActiveUserSummary } from "@/features/tasks/queries";
import { TaskCreatePayloadSchema } from "@/features/tasks/schemas";
import { TaskStatus } from "@/generated/prisma/browser";
import { useModalForm } from "@/lib/useModalForm";

import styles from "./AddTaskModal.module.css";

const STATUS_OPTIONS = Object.values(TaskStatus);

interface AddTaskModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void;
  caseId: string;
  users: ActiveUserSummary[];
}

export function AddTaskModal({
  isOpen,
  onOpenChange,
  onSuccess,
  caseId,
  users,
}: AddTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>(TaskStatus.Pending);
  const [assigneeIds, setAssigneeIds] = useState<Set<string>>(new Set());

  const { isPending, submitForm, handleCancel } = useModalForm<
    z.input<typeof TaskCreatePayloadSchema>
  >({
    submit: createTaskAction,
    onOpenChange,
    onSuccess,
    successMessage: "Task created",
    failureMessage: "Failed to create task",
    reset: () => {
      setTitle("");
      setDescription("");
      setStatus(TaskStatus.Pending);
      setAssigneeIds(new Set());
    },
  });

  async function handleSubmit() {
    if (!title.trim()) return;

    await submitForm({
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      case_id: caseId,
      assignee_ids: Array.from(assigneeIds),
    });
  }

  return (
    <Modal title="Add Task" isOpen={isOpen} onOpenChange={handleCancel} className={styles.modal}>
      <div className={styles.content}>
        <TextField
          label="Title"
          value={title}
          onChange={setTitle}
          placeholder="Enter task title..."
          isDisabled={isPending}
        />
        <TextField
          label="Description"
          isTextArea
          rows={3}
          value={description}
          onChange={setDescription}
          placeholder="Optional description..."
          isDisabled={isPending}
        />
        <Select
          label="Status"
          value={status}
          onChange={(k) => setStatus(String(k) as TaskStatus)}
          isDisabled={isPending}
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
          isDisabled={isPending}
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
          <Button variant="secondary" onPress={handleCancel} isDisabled={isPending}>
            Cancel
          </Button>
          <Button
            onPress={handleSubmit}
            isDisabled={!title.trim() || isPending}
            isPending={isPending}
          >
            Save Task
          </Button>
        </div>
      </div>
    </Modal>
  );
}
