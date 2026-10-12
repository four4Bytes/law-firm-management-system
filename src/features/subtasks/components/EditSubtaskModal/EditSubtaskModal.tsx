"use client";

import { CalendarDate, Time } from "@internationalized/date";
import { useEffect, useMemo, useState } from "react";
import { Form } from "react-aria-components";
import { z } from "zod";

import { Button } from "@/components/ui/Button/Button";
import { DatePicker } from "@/components/ui/DatePicker/DatePicker";
import { Modal } from "@/components/ui/Modal/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge/StatusBadge";
import { TextField } from "@/components/ui/TextField/TextField";
import { TimeField } from "@/components/ui/TimeField/TimeField";
import { completeSubtaskAction, updateSubtaskAction } from "@/features/subtasks/actions";
import subtaskStyles from "@/features/subtasks/components/TaskSubtaskRows/TaskSubtaskRows.module.css";
import { getSubtaskStatusLabel, getSubtaskStatusVariant } from "@/features/subtasks/display";
import type { SubtaskDetailRow } from "@/features/subtasks/queries";
import { SubtaskUpdatePayloadSchema } from "@/features/subtasks/schemas";
import { getTaskDetailRowByIdAction } from "@/features/tasks/actions";
import { UserChips } from "@/features/users/components/UserChips/UserChips";
import { UserSelect } from "@/features/users/components/UserSelect/UserSelect";
import type { UserSummary } from "@/features/users/types";
import { SubtaskStatus } from "@/generated/prisma/browser";
import { toastActionError, toastSuccess } from "@/lib/hooks/toast-utils";
import { useModalForm } from "@/lib/hooks/useModalForm";
import {
  combineDateTime,
  formatDateTime,
  formatMonthDay,
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
  const [parent, setParent] = useState<{
    title: string;
    due_date: Date | null;
    assignees: string[];
  } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    async function loadParent() {
      try {
        const data = await getTaskDetailRowByIdAction(subtask.task_id);
        const row = data.row;
        if (!cancelled) {
          setParent(
            row
              ? {
                  title: row.title,
                  due_date: row.due_date ? new Date(row.due_date) : null,
                  assignees: row.assignTo.map((assignee) => assignee.name),
                }
              : null,
          );
        }
      } catch {
        if (!cancelled) setParent(null);
      }
    }

    void loadParent();

    return () => {
      cancelled = true;
    };
  }, [isOpen, subtask.task_id]);

  const newDueDate = combineDateTime(dueDate, dueTime);
  const parentDue = parent?.due_date ?? null;
  const exceedsParent = parentDue !== null && newDueDate.getTime() > parentDue.getTime();
  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => Number(assigneeIds.has(b.id)) - Number(assigneeIds.has(a.id))),
    [users, assigneeIds],
  );
  const selectedUsers = useMemo(
    () => sortedUsers.filter((user) => assigneeIds.has(user.id)),
    [sortedUsers, assigneeIds],
  );

  function handleRemoveAssignee(id: string): void {
    setAssigneeIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

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

  function validateTitle(value: unknown): string | null {
    const message = createFieldValidator(SubtaskUpdatePayloadSchema.shape.title)(value);
    return message === null || /[.!?]$/.test(message) ? message : `${message}.`;
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
          {parent && (
            <div className={styles.parentHeader}>
              <span className={styles.parentLabel}>Parent task</span>
              <span className={styles.parentTitle}>{parent.title}</span>
              <span className={styles.parentMeta}>
                {parent.due_date ? `Due ${formatDateTime(parent.due_date)}` : "No deadline"}
                {parent.assignees.length > 0 && ` · Assigned to ${parent.assignees.join(", ")}`}
              </span>
            </div>
          )}
          <TextField
            label="Title"
            value={title}
            onChange={setTitle}
            placeholder="Subtask title"
            validate={validateTitle}
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
            users={sortedUsers}
            selectedIds={assigneeIds}
            onChange={setAssigneeIds}
            isDisabled={disabled}
            isLoading={isLoadingUsers}
            placeholder={assigneeIds.size > 0 ? "" : undefined}
            validate={createFieldValidator(SubtaskUpdatePayloadSchema.shape.assignee_ids)}
          />
          {assigneeIds.size > 0 && (
            <UserChips
              users={selectedUsers}
              onRemove={handleRemoveAssignee}
              isDisabled={disabled}
            />
          )}
          <div className={styles.dateRow}>
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
          </div>
          {parentDue && (
            <p className={styles.deadlineHint}>
              {`Parent task deadline: ${formatDateTime(parentDue)}`}
            </p>
          )}
          {exceedsParent && parentDue && (
            <p className={styles.parentWarning}>
              {`This due date is after the parent task's deadline (${formatMonthDay(parentDue)}). You can still save it.`}
            </p>
          )}
          <div className={styles.statusBox}>
            <div className={styles.statusLabel}>
              <span>Status</span>
              <StatusBadge
                variant={getSubtaskStatusVariant(subtask.status)}
                className={subtaskStyles.smallBadge}
              >
                {getSubtaskStatusLabel(subtask.status)}
              </StatusBadge>
            </div>
            {!readOnly && subtask.status !== SubtaskStatus.Done && (
              <Button
                variant="outlineSuccess"
                type="button"
                onPress={handleComplete}
                isDisabled={isPending || isCompleting}
                isPending={isCompleting}
              >
                Mark complete
              </Button>
            )}
          </div>
          <div className={styles.actions}>
            <Button variant="outline" type="button" onPress={handleCancel} isDisabled={isPending}>
              Cancel
            </Button>
            {!readOnly && (
              <Button
                variant="secondary"
                type="submit"
                isDisabled={isPending || !isDirty}
                isPending={isPending}
              >
                Save Changes
              </Button>
            )}
          </div>
        </div>
      </Form>
    </Modal>
  );
}
