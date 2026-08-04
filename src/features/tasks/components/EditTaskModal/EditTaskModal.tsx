"use client";

import { useState } from "react";
import { Form } from "react-aria-components";
import { z } from "zod";

import { AssigneeSelect } from "@/components/ui/AssigneeSelect/AssigneeSelect";
import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";
import { Select, SelectItem } from "@/components/ui/Select/Select";
import { TextField } from "@/components/ui/TextField/TextField";
import { updateTaskAction } from "@/features/tasks/actions";
import type { ActiveUserSummary, TaskDetailRow } from "@/features/tasks/queries";
import { TaskUpdatePayloadSchema } from "@/features/tasks/schemas";
import { TaskStatus } from "@/generated/prisma/browser";
import {
  createFieldValidator,
  optionalString,
  requiredString,
  selectEnumHandler,
} from "@/lib/form-utils";
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

  const { isPending, submitForm, handleCancel } = useModalForm<
    z.input<typeof TaskUpdatePayloadSchema>
  >({
    submit: updateTaskAction,
    onOpenChange,
    onSuccess,
    successMessage: "Task updated",
    failureMessage: "Failed to update task",
    schema: TaskUpdatePayloadSchema,
  });

  async function handleSave(event: React.SyntheticEvent) {
    event.preventDefault();
    if (isPending) return;

    await submitForm({
      taskId: task.id,
      title: requiredString(title),
      description: optionalString(description),
      status,
      assignee_ids: Array.from(assigneeIds),
    });
  }

  return (
    <Modal title="Edit Task" isOpen={isOpen} onOpenChange={handleCancel} className={styles.modal}>
      <Form onSubmit={handleSave}>
        <div className={styles.content}>
          <TextField
            label="Title"
            value={title}
            onChange={setTitle}
            placeholder="Enter task title..."
            validate={createFieldValidator(TaskUpdatePayloadSchema.shape.title)}
            isDisabled={isPending}
          />
          <TextField
            label="Description"
            isTextArea
            rows={3}
            value={description}
            onChange={setDescription}
            placeholder="Optional description..."
            validate={createFieldValidator(TaskUpdatePayloadSchema.shape.description)}
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
          <AssigneeSelect
            users={users}
            assigneeIds={assigneeIds}
            onChange={setAssigneeIds}
            isDisabled={isPending}
          />
          <div className={styles.actions}>
            <Button variant="secondary" type="button" onPress={handleCancel} isDisabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" isDisabled={isPending} isPending={isPending}>
              Save
            </Button>
          </div>
        </div>
      </Form>
    </Modal>
  );
}
