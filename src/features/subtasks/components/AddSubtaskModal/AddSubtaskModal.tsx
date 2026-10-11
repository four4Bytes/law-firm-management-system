"use client";

import { CalendarDate, Time } from "@internationalized/date";
import { useEffect, useState } from "react";
import { Form } from "react-aria-components";
import { z } from "zod";

import { Button } from "@/components/ui/Button/Button";
import { DatePicker } from "@/components/ui/DatePicker/DatePicker";
import { Modal } from "@/components/ui/Modal/Modal";
import { TextField } from "@/components/ui/TextField/TextField";
import { TimeField } from "@/components/ui/TimeField/TimeField";
import { createSubtaskAction } from "@/features/subtasks/actions";
import { SubtaskCreatePayloadSchema } from "@/features/subtasks/schemas";
import { getTaskDetailRowByIdAction } from "@/features/tasks/actions";
import { UserSelect } from "@/features/users/components/UserSelect/UserSelect";
import type { UserSummary } from "@/features/users/types";
import { useModalForm } from "@/lib/hooks/useModalForm";
import { combineDateTime, formatDateTime, getToday, isBeforeToday } from "@/lib/primitives/date";
import { createFieldValidator, optionalString, requiredString } from "@/lib/validation/form-utils";

import styles from "./AddSubtaskModal.module.css";

interface AddSubtaskModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void;
  taskId: string;
  users: UserSummary[];
  isLoadingUsers?: boolean;
}

export function AddSubtaskModal({
  isOpen,
  onOpenChange,
  onSuccess,
  taskId,
  users,
  isLoadingUsers = false,
}: AddSubtaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<Set<string>>(new Set());
  const [dueDate, setDueDate] = useState<CalendarDate>(getToday());
  const [dueTime, setDueTime] = useState<Time>(new Time(9, 0));
  const [parentDue, setParentDue] = useState<Date | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    async function loadParent() {
      try {
        const data = await getTaskDetailRowByIdAction(taskId);
        const due = (data.row as unknown as { due_date?: Date | string | null } | null)?.due_date;
        if (!cancelled) setParentDue(due ? new Date(due) : null);
      } catch {
        if (!cancelled) setParentDue(null);
      }
    }

    void loadParent();

    return () => {
      cancelled = true;
    };
  }, [isOpen, taskId]);

  function validateDueDate(): string | null {
    if (isBeforeToday(combineDateTime(dueDate, dueTime))) {
      return "Due date cannot be in the past";
    }
    return null;
  }

  const chosenDue = combineDateTime(dueDate, dueTime);
  const exceedsParent = parentDue !== null && chosenDue.getTime() > parentDue.getTime();
  const parentHint = exceedsParent
    ? `Exceeds parent deadline (${formatDateTime(parentDue)}).`
    : undefined;

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
      setAssigneeIds(new Set());
      setDueDate(getToday());
      setDueTime(new Time(9, 0));
    },
  });

  async function handleSubmit(event: React.SyntheticEvent) {
    event.preventDefault();
    if (isPending) return;

    await submitForm({
      taskId,
      title: requiredString(title),
      description: optionalString(description),
      due_date: chosenDue,
      assignee_ids: Array.from(assigneeIds),
    });
  }

  return (
    <Modal title="Add Subtask" isOpen={isOpen} onOpenChange={handleCancel} className={styles.modal}>
      <Form validationBehavior="native" onSubmit={handleSubmit}>
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
          <UserSelect
            users={users}
            selectedIds={assigneeIds}
            onChange={setAssigneeIds}
            isDisabled={isPending}
            isLoading={isLoadingUsers}
            validate={createFieldValidator(SubtaskCreatePayloadSchema.shape.assignee_ids)}
          />
          <DatePicker
            label="Due Date"
            value={dueDate}
            onChange={(v) => v && setDueDate(v)}
            isDisabled={isPending}
            description={parentHint}
            validate={validateDueDate}
          />
          <TimeField
            label="Due Time"
            value={dueTime}
            onChange={(v) => v && setDueTime(new Time(v.hour, v.minute))}
            isDisabled={isPending}
          />
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
