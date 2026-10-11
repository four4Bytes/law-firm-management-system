"use client";

import { CalendarDate, Time } from "@internationalized/date";
import { useState } from "react";
import { Form } from "react-aria-components";
import { z } from "zod";

import { Button } from "@/components/ui/Button/Button";
import { DatePicker } from "@/components/ui/DatePicker/DatePicker";
import { Modal } from "@/components/ui/Modal/Modal";
import { TextField } from "@/components/ui/TextField/TextField";
import { TimeField } from "@/components/ui/TimeField/TimeField";
import { completeSubtaskAction, updateSubtaskAction } from "@/features/subtasks/actions";
import type { SubtaskDetailRow } from "@/features/subtasks/queries";
import { SubtaskUpdatePayloadSchema } from "@/features/subtasks/schemas";
import { UserSelect } from "@/features/users/components/UserSelect/UserSelect";
import type { UserSummary } from "@/features/users/types";
import { SubtaskStatus } from "@/generated/prisma/browser";
import { toastActionError, toastSuccess } from "@/lib/hooks/toast-utils";
import { useModalForm } from "@/lib/hooks/useModalForm";
import {
  combineDateTime,
  isBeforeToday,
  toCalendarDate,
  toMinuteEpoch,
  toTimeValue,
} from "@/lib/primitives/date";
import { createFieldValidator, optionalString, requiredString } from "@/lib/validation/form-utils";

import styles from "./EditSubtaskModal.module.css";

interface EditSubtaskModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void;
  subtask: SubtaskDetailRow;
  readOnly?: boolean;
  users: UserSummary[];
  isLoadingUsers?: boolean;
}

export function EditSubtaskModal({
  isOpen,
  onOpenChange,
  onSuccess,
  subtask,
  readOnly = false,
  users,
  isLoadingUsers = false,
}: EditSubtaskModalProps) {
  const [title, setTitle] = useState(subtask.title);
  const [description, setDescription] = useState(subtask.description ?? "");
  const [assigneeIds, setAssigneeIds] = useState<Set<string>>(new Set(subtask.assignee_ids));
  const [dueDate, setDueDate] = useState<CalendarDate>(toCalendarDate(subtask.due_date));
  const [dueTime, setDueTime] = useState<Time>(toTimeValue(subtask.due_date));
  const [isCompleting, setIsCompleting] = useState(false);

  const newDueDate = combineDateTime(dueDate, dueTime);
  const isDirty =
    title !== subtask.title ||
    description !== (subtask.description ?? "") ||
    toMinuteEpoch(newDueDate) !== toMinuteEpoch(subtask.due_date) ||
    assigneeIds.size !== subtask.assignee_ids.length ||
    [...assigneeIds].some((id) => !subtask.assignee_ids.includes(id));

  function validateDueDate(): string | null {
    if (isBeforeToday(newDueDate)) {
      return "Due date cannot be in the past";
    }
    return null;
  }

  const { isPending, submitForm, handleCancel } = useModalForm<
    z.input<typeof SubtaskUpdatePayloadSchema>
  >({
    submit: readOnly ? undefined : updateSubtaskAction,
    onOpenChange,
    onSuccess,
    successMessage: "Subtask updated",
    successDescription: "The subtask has been updated.",
    failureMessage: "Failed to update subtask",
    schema: SubtaskUpdatePayloadSchema,
  });

  async function handleSave(event: React.SyntheticEvent) {
    event.preventDefault();
    if (isPending) return;

    await submitForm({
      subtaskId: subtask.id,
      title: requiredString(title),
      description: optionalString(description),
      due_date: newDueDate,
      assignee_ids: Array.from(assigneeIds),
    });
  }

  async function handleComplete() {
    if (isPending || isCompleting) return;
    setIsCompleting(true);
    try {
      const result = await completeSubtaskAction({ subtaskId: subtask.id });
      if (result.success) {
        toastSuccess("Subtask completed", "The subtask has been marked as done.");
        onOpenChange(false);
        onSuccess();
      } else {
        toastActionError(result, "complete subtask");
      }
    } finally {
      setIsCompleting(false);
    }
  }

  const disabled = isPending || readOnly;

  return (
    <Modal
      title={readOnly ? "Subtask" : "Edit Subtask"}
      isOpen={isOpen}
      onOpenChange={handleCancel}
      className={styles.modal}
    >
      <Form validationBehavior="native" onSubmit={handleSave}>
        <div className={styles.content}>
          <TextField
            label="Title"
            value={title}
            onChange={setTitle}
            placeholder="Subtask title"
            validate={createFieldValidator(SubtaskUpdatePayloadSchema.shape.title)}
            isDisabled={disabled}
          />
          <TextField
            label="Description"
            value={description}
            onChange={setDescription}
            placeholder="Optional description"
            isTextArea
            rows={3}
            validate={createFieldValidator(SubtaskUpdatePayloadSchema.shape.description)}
            isDisabled={disabled}
          />
          <UserSelect
            users={users}
            selectedIds={assigneeIds}
            onChange={setAssigneeIds}
            isDisabled={disabled}
            isLoading={isLoadingUsers}
            validate={createFieldValidator(SubtaskUpdatePayloadSchema.shape.assignee_ids)}
          />
          <DatePicker
            label="Due Date"
            value={dueDate}
            onChange={(v) => v && setDueDate(v)}
            isDisabled={disabled}
            validate={validateDueDate}
          />
          <TimeField
            label="Due Time"
            value={dueTime}
            onChange={(v) => v && setDueTime(new Time(v.hour, v.minute))}
            isDisabled={disabled}
          />
          <div className={styles.actions}>
            <Button variant="secondary" type="button" onPress={handleCancel} isDisabled={isPending}>
              Cancel
            </Button>
            {!readOnly && (
              <Button type="submit" isDisabled={isPending || !isDirty} isPending={isPending}>
                Save
              </Button>
            )}
            {!readOnly && subtask.status !== SubtaskStatus.Done && (
              <Button
                variant="secondary"
                type="button"
                onPress={handleComplete}
                isDisabled={isPending || isCompleting}
                isPending={isCompleting}
              >
                Mark complete
              </Button>
            )}
          </div>
        </div>
      </Form>
    </Modal>
  );
}
