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
import { updateSubtaskAction } from "@/features/subtasks/actions";
import type { SubtaskRow } from "@/features/subtasks/queries";
import { SubtaskUpdatePayloadSchema } from "@/features/subtasks/schemas";
import type { ActiveUserSummary } from "@/features/tasks/queries";
import { UserSelect } from "@/features/users/components/UserSelect/UserSelect";
import { SubtaskStatus } from "@/generated/prisma/browser";
import { toCalendarDate } from "@/lib/date";
import {
  createFieldValidator,
  optionalString,
  requiredString,
  selectEnumHandler,
  toDateValue,
} from "@/lib/form-utils";
import { useModalForm } from "@/lib/useModalForm";

import styles from "./EditSubtaskModal.module.css";

const STATUS_OPTIONS = Object.values(SubtaskStatus);

interface EditSubtaskModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void;
  subtask: SubtaskRow;
  users: ActiveUserSummary[];
}

export function EditSubtaskModal({
  isOpen,
  onOpenChange,
  onSuccess,
  subtask,
  users,
}: EditSubtaskModalProps) {
  const [title, setTitle] = useState(subtask.title);
  const [description, setDescription] = useState(subtask.description ?? "");
  const [priority, setPriority] = useState(subtask.priority ?? "");
  const [assigneeIds, setAssigneeIds] = useState<Set<string>>(new Set(subtask.assignee_ids));
  const [status, setStatus] = useState<SubtaskStatus>(subtask.status);
  const [dueDate, setDueDate] = useState<CalendarDate | null>(
    subtask.due_date ? toCalendarDate(subtask.due_date) : null,
  );

  const { isPending, submitForm, handleCancel } = useModalForm<
    z.input<typeof SubtaskUpdatePayloadSchema>
  >({
    submit: updateSubtaskAction,
    onOpenChange,
    onSuccess,
    successMessage: "Subtask updated",
    successDescription: "The subtask has been updated.",
    failureMessage: "Failed to update subtask",
    schema: SubtaskUpdatePayloadSchema,
  });

  async function handleSubmit(event: React.SyntheticEvent) {
    event.preventDefault();
    if (isPending) return;

    await submitForm({
      subtaskId: subtask.id,
      title: requiredString(title),
      description: optionalString(description),
      priority: optionalString(priority),
      status,
      due_date: dueDate ? toDateValue(dueDate) : null,
      assignee_ids: Array.from(assigneeIds),
    });
  }

  return (
    <Modal
      title="Edit Subtask"
      isOpen={isOpen}
      onOpenChange={handleCancel}
      className={styles.modal}
    >
      <Form onSubmit={handleSubmit}>
        <div className={styles.content}>
          <TextField
            label="Title"
            value={title}
            onChange={setTitle}
            placeholder="Subtask title"
            validate={createFieldValidator(SubtaskUpdatePayloadSchema.shape.title)}
            isDisabled={isPending}
          />
          <TextField
            label="Description"
            value={description}
            onChange={setDescription}
            placeholder="Optional description"
            isTextArea
            rows={3}
            validate={createFieldValidator(SubtaskUpdatePayloadSchema.shape.description)}
            isDisabled={isPending}
          />
          <TextField
            label="Priority"
            value={priority}
            onChange={setPriority}
            placeholder="Optional priority (e.g. High)"
            validate={createFieldValidator(SubtaskUpdatePayloadSchema.shape.priority)}
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
              Save Changes
            </Button>
          </div>
        </div>
      </Form>
    </Modal>
  );
}
