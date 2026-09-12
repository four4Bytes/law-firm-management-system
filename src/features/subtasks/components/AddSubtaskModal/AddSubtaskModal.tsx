"use client";

import { type CalendarDate } from "@internationalized/date";
import { useState } from "react";
import { Form } from "react-aria-components";
import { z } from "zod";

import { Button } from "@/components/ui/Button/Button";
import { DateField } from "@/components/ui/DateField/DateField";
import { Modal } from "@/components/ui/Modal/Modal";
import { Select, SelectItem } from "@/components/ui/Select/Select";
import { TextField } from "@/components/ui/TextField/TextField";
import { createSubtaskAction } from "@/features/subtasks/actions";
import { SubtaskCreatePayloadSchema } from "@/features/subtasks/schemas";
import type { ActiveUserSummary } from "@/features/tasks/queries";
import { UserSelect } from "@/features/users/components/UserSelect/UserSelect";
import { SubtaskStatus } from "@/generated/prisma/browser";
import {
  createFieldValidator,
  optionalString,
  requiredString,
  selectEnumHandler,
  toDateValue,
} from "@/lib/form-utils";
import { useModalForm } from "@/lib/useModalForm";

import styles from "./AddSubtaskModal.module.css";

const STATUS_OPTIONS = Object.values(SubtaskStatus);

interface AddSubtaskModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void;
  taskId: string;
  users: ActiveUserSummary[];
}

export function AddSubtaskModal({
  isOpen,
  onOpenChange,
  onSuccess,
  taskId,
  users,
}: AddSubtaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<SubtaskStatus>(SubtaskStatus.Pending);
  const [dueDate, setDueDate] = useState<CalendarDate | null>(null);

  const { isPending, submitForm, handleCancel } = useModalForm<
    z.input<typeof SubtaskCreatePayloadSchema>
  >({
    submit: createSubtaskAction,
    onOpenChange,
    onSuccess,
    successMessage: "Subtask added",
    successDescription: "The subtask has been added.",
    failureMessage: "Failed to add subtask",
    schema: SubtaskCreatePayloadSchema,
    reset: () => {
      setTitle("");
      setDescription("");
      setPriority("");
      setAssigneeIds(new Set());
      setStatus(SubtaskStatus.Pending);
      setDueDate(null);
    },
  });

  async function handleSubmit(event: React.SyntheticEvent) {
    event.preventDefault();
    if (isPending) return;

    await submitForm({
      title: requiredString(title),
      description: optionalString(description),
      priority: optionalString(priority),
      task_id: taskId,
      status,
      due_date: dueDate ? toDateValue(dueDate) : undefined,
      assignee_ids: Array.from(assigneeIds),
    });
  }

  return (
    <Modal title="Add Subtask" isOpen={isOpen} onOpenChange={handleCancel} className={styles.modal}>
      <Form onSubmit={handleSubmit}>
        <div className={styles.content}>
          <TextField
            label="Title"
            value={title}
            onChange={setTitle}
            placeholder="Subtask title"
            validate={createFieldValidator(SubtaskCreatePayloadSchema.shape.title)}
            isDisabled={isPending}
          />
          <TextField
            label="Description"
            value={description}
            onChange={setDescription}
            placeholder="Optional description"
            isTextArea
            rows={3}
            validate={createFieldValidator(SubtaskCreatePayloadSchema.shape.description)}
            isDisabled={isPending}
          />
          <TextField
            label="Priority"
            value={priority}
            onChange={setPriority}
            placeholder="Optional priority (e.g. High)"
            validate={createFieldValidator(SubtaskCreatePayloadSchema.shape.priority)}
            isDisabled={isPending}
          />
          <UserSelect
            users={users}
            selectedIds={assigneeIds}
            onChange={setAssigneeIds}
            isDisabled={isPending}
          />
          <DateField
            label="Due Date"
            value={dueDate}
            onChange={(v) => setDueDate(v)}
            isDisabled={isPending}
          />
          <Select
            label="Status"
            value={status}
            onChange={selectEnumHandler(SubtaskStatus, setStatus)}
            isDisabled={isPending}
          >
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} id={s}>
                {s === SubtaskStatus.InProgress ? "In Progress" : s}
              </SelectItem>
            ))}
          </Select>
          <div className={styles.actions}>
            <Button variant="secondary" type="button" onPress={handleCancel} isDisabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" isDisabled={isPending} isPending={isPending}>
              Save Subtask
            </Button>
          </div>
        </div>
      </Form>
    </Modal>
  );
}
