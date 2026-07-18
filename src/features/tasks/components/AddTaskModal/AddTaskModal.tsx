"use client";

import { useState } from "react";
import { Form } from "react-aria-components";
import { z } from "zod";

import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";
import { Select, SelectItem } from "@/components/ui/Select/Select";
import { TextField } from "@/components/ui/TextField/TextField";
import { createTaskAction } from "@/features/tasks/actions";
import type { ActiveUserSummary } from "@/features/tasks/queries";
import { TaskCreatePayloadSchema } from "@/features/tasks/schemas";
import { TaskStatus } from "@/generated/prisma/browser";
import {
  createFieldValidator,
  keysToSet,
  optionalString,
  requiredString,
  selectEnumHandler,
} from "@/lib/form-utils";
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
    schema: TaskCreatePayloadSchema,
    reset: () => {
      setTitle("");
      setDescription("");
      setStatus(TaskStatus.Pending);
      setAssigneeIds(new Set());
    },
  });

  async function handleSubmit(event: React.SyntheticEvent) {
    event.preventDefault();
    if (isPending) return;

    await submitForm({
      title: requiredString(title),
      description: optionalString(description),
      status,
      case_id: caseId,
      assignee_ids: Array.from(assigneeIds),
    });
  }

  return (
    <Modal title="Add Task" isOpen={isOpen} onOpenChange={handleCancel} className={styles.modal}>
      <Form onSubmit={handleSubmit}>
        <div className={styles.content}>
          <TextField
            label="Title"
            value={title}
            onChange={setTitle}
            placeholder="Enter task title..."
            validate={createFieldValidator(TaskCreatePayloadSchema.shape.title)}
            isDisabled={isPending}
          />
          <TextField
            label="Description"
            isTextArea
            rows={3}
            value={description}
            onChange={setDescription}
            placeholder="Optional description..."
            validate={createFieldValidator(TaskCreatePayloadSchema.shape.description)}
            isDisabled={isPending}
          />
          <Select
            label="Status"
            value={status}
            onChange={selectEnumHandler(TaskStatus, setStatus)}
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
            onChange={(keys) => setAssigneeIds(keysToSet(keys))}
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
            <Button variant="secondary" type="button" onPress={handleCancel} isDisabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" isDisabled={isPending} isPending={isPending}>
              Save Task
            </Button>
          </div>
        </div>
      </Form>
    </Modal>
  );
}
