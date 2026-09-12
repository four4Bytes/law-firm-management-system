"use client";

import { type CalendarDate } from "@internationalized/date";
import { useEffect, useState } from "react";
import { Form } from "react-aria-components";
import { z } from "zod";

import { Button } from "@/components/ui/Button/Button";
import { DateField } from "@/components/ui/DateField/DateField";
import { Modal } from "@/components/ui/Modal/Modal";
import { Select, SelectItem } from "@/components/ui/Select/Select";
import { TextField } from "@/components/ui/TextField/TextField";
import { createSubtaskAction } from "@/features/subtasks/actions";
import { SubtaskCreatePayloadSchema } from "@/features/subtasks/schemas";
import { getTaskDetailRowByIdAction } from "@/features/tasks/actions";
import type { ActiveUserSummary } from "@/features/tasks/queries";
import { UserSelect } from "@/features/users/components/UserSelect/UserSelect";
import { SubtaskStatus } from "@/generated/prisma/browser";
import {
  createFieldValidator,
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
  const [parentPriority, setParentPriority] = useState<string | null>(null);
  const [assigneeIds, setAssigneeIds] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<SubtaskStatus>(SubtaskStatus.Pending);
  const [dueDate, setDueDate] = useState<CalendarDate | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    async function loadParentPriority() {
      try {
        const data = await getTaskDetailRowByIdAction(taskId);
        if (cancelled) return;
        setParentPriority(data.row?.priority ?? null);
      } catch {
        if (cancelled) return;
        setParentPriority(null);
      }
    }

    void loadParentPriority();

    return () => {
      cancelled = true;
    };
  }, [isOpen, taskId]);

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
      setStatus(SubtaskStatus.Pending);
      setDueDate(null);
    },
  });

  async function handleSubmit(event: React.SyntheticEvent) {
    event.preventDefault();
    if (isPending) return;

    await submitForm({
      title: requiredString(title),
      description: requiredString(description),
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
            labelClassName={styles.fieldLabel}
            value={title}
            onChange={setTitle}
            placeholder="Subtask title"
            validate={createFieldValidator(SubtaskCreatePayloadSchema.shape.title)}
            isDisabled={isPending}
          />
          <TextField
            label="Description"
            labelClassName={styles.fieldLabel}
            value={description}
            onChange={setDescription}
            placeholder="Enter subtask description"
            isTextArea
            rows={3}
            validate={createFieldValidator(SubtaskCreatePayloadSchema.shape.description)}
            isDisabled={isPending}
          />
          <div className={styles.readOnlyField}>
            <span className={styles.readOnlyLabel}>Priority</span>
            <span className={styles.readOnlyValue}>
              {parentPriority ?? "—"} (inherited from main task)
            </span>
          </div>
          <UserSelect
            users={users}
            selectedIds={assigneeIds}
            onChange={setAssigneeIds}
            isDisabled={isPending}
            labelClassName={styles.fieldLabel}
          />
          <DateField
            label="Due Date"
            value={dueDate}
            onChange={(v) => setDueDate(v)}
            isDisabled={isPending}
          />
          <Select
            label="Status"
            labelClassName={styles.fieldLabel}
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
