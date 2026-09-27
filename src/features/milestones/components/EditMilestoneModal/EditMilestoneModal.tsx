"use client";

import { CalendarDate, Time } from "@internationalized/date";
import { useState } from "react";
import { Form } from "react-aria-components";
import { z } from "zod";

import { Button } from "@/components/ui/Button/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog/ConfirmDialog";
import { DatePicker } from "@/components/ui/DatePicker/DatePicker";
import { Modal } from "@/components/ui/Modal/Modal";
import { Select, SelectItem } from "@/components/ui/Select/Select";
import { TextField } from "@/components/ui/TextField/TextField";
import { TimeField } from "@/components/ui/TimeField/TimeField";
import { updateMilestoneAction } from "@/features/milestones/actions";
import type { MilestoneRow } from "@/features/milestones/queries";
import { MilestoneUpdatePayloadSchema } from "@/features/milestones/schemas";
import { isTerminalMilestoneStatus, milestoneStatusOptions } from "@/features/milestones/status";
import { CaseMilestoneStatus } from "@/generated/prisma/browser";
import { toastError } from "@/lib/hooks/toast-utils";
import { useModalForm } from "@/lib/hooks/useModalForm";
import {
  combineDateTime,
  formatDateTime,
  isAfterToday,
  isBeforeToday,
  toCalendarDate,
  toMinuteEpoch,
  toTimeValue,
} from "@/lib/primitives/date";
import {
  createFieldValidator,
  optionalString,
  requiredString,
  selectEnumHandler,
} from "@/lib/validation/form-utils";

import styles from "./EditMilestoneModal.module.css";

interface EditMilestoneModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void;
  milestone: MilestoneRow;
}

export function EditMilestoneModal({
  isOpen,
  onOpenChange,
  onSuccess,
  milestone,
}: EditMilestoneModalProps) {
  const [title, setTitle] = useState(milestone.title);
  const [description, setDescription] = useState(milestone.description ?? "");
  const [dueDate, setDueDate] = useState<CalendarDate>(toCalendarDate(milestone.due_date));
  const [dueTime, setDueTime] = useState<Time>(toTimeValue(milestone.due_date));
  const [status, setStatus] = useState<CaseMilestoneStatus>(
    milestone.status as CaseMilestoneStatus,
  );
  const [showRescheduleConfirm, setShowRescheduleConfirm] = useState(false);
  const newDueDate = combineDateTime(dueDate, dueTime);
  const dueDateChanged = toMinuteEpoch(newDueDate) !== toMinuteEpoch(milestone.due_date);
  const statusChanged = status !== milestone.status;
  const isDirty =
    title !== milestone.title ||
    description !== (milestone.description ?? "") ||
    dueDateChanged ||
    statusChanged;

  // Mirrors the date-reschedule lock in `updateMilestoneAction`: a terminal
  // milestone keeps its deadline unless the same save reopens it to Pending,
  // which is the only way the date becomes editable again.
  const savedStatus = milestone.status as CaseMilestoneStatus;
  const dueDateLocked =
    isTerminalMilestoneStatus(savedStatus) && status !== CaseMilestoneStatus.Pending;
  const dueDateLockedDescription = dueDateLocked
    ? "Reopen to Pending to change the due date."
    : undefined;

  // The two rules couple Status and Due Date, so both fields report them. RAC
  // surfaces a field's own error only, which is why the status select cannot
  // rely on the DatePicker's validator alone.
  function statusDateError(): string | null {
    if (status === CaseMilestoneStatus.Pending && isBeforeToday(newDueDate)) {
      return "A pending milestone cannot be due in the past";
    }
    if (status === CaseMilestoneStatus.Done && isAfterToday(newDueDate)) {
      return "A completed milestone cannot be due in the future";
    }
    return null;
  }

  function validateDueDate(): string | null {
    if (!dueDateChanged && !statusChanged) return null;
    return statusDateError();
  }

  function validateStatus(): string | null {
    if (!dueDateChanged && !statusChanged) return null;
    return statusDateError();
  }

  // Only speak up when a status choice is actually constrained, so the field
  // stays quiet on an ordinary edit. Reopening a lapsed milestone is legal but
  // insufficient on its own, which is the case worth warning about.
  function statusDescription(): string | undefined {
    if (status === CaseMilestoneStatus.Pending) {
      if (!statusChanged) return undefined;
      if (isBeforeToday(newDueDate)) {
        return "Reopening restarts reminders, and a pending milestone cannot stay overdue — move the due date to today or later.";
      }
      return "Selecting Pending reopens this milestone and restarts its reminders.";
    }
    if (status === CaseMilestoneStatus.Done && isAfterToday(newDueDate)) {
      return "A completed milestone cannot be due in the future — move the due date to today or earlier.";
    }
    return undefined;
  }

  const { isPending, submitForm, handleCancel } = useModalForm<
    z.input<typeof MilestoneUpdatePayloadSchema>
  >({
    submit: updateMilestoneAction,
    onOpenChange,
    onSuccess,
    successMessage: "Milestone updated",
    successDescription: "The milestone has been updated.",
    failureMessage: "Failed to update milestone. Please try again.",
    schema: MilestoneUpdatePayloadSchema,
  });

  function buildPayload() {
    return {
      milestoneId: milestone.id,
      title: requiredString(title),
      description: optionalString(description),
      due_date: newDueDate,
      status,
    };
  }

  async function handleSave(event: React.SyntheticEvent) {
    event.preventDefault();
    if (isPending) return;

    if (dueDateChanged) {
      setShowRescheduleConfirm(true);
      return;
    }

    await submitForm(buildPayload());
  }

  async function handleRescheduleConfirm() {
    if (isPending) return;
    setShowRescheduleConfirm(false);
    // A record can lapse while the modal sits open, so re-check before spending
    // a round trip on a request the action will reject.
    const error = validateDueDate();
    if (error) {
      toastError("Invalid due date", `${error}. Choose a date that matches the status.`);
      return;
    }
    await submitForm(buildPayload());
  }

  return (
    <Modal
      title="Edit Milestone"
      isOpen={isOpen}
      onOpenChange={handleCancel}
      className={styles.modal}
    >
      <ConfirmDialog
        isOpen={showRescheduleConfirm}
        onOpenChange={setShowRescheduleConfirm}
        title="Reschedule milestone"
        confirmLabel="Reschedule"
        onConfirm={handleRescheduleConfirm}
      >
        {`Move the due date from ${formatDateTime(milestone.due_date)} to ${formatDateTime(newDueDate)}? Case assignees will be notified and reminders will restart.`}
      </ConfirmDialog>
      <Form validationBehavior="native" onSubmit={handleSave}>
        <div className={styles.content}>
          <TextField
            label="Title"
            value={title}
            onChange={setTitle}
            placeholder="Milestone title"
            validate={createFieldValidator(MilestoneUpdatePayloadSchema.shape.title)}
            isDisabled={isPending}
          />
          <TextField
            label="Description"
            value={description}
            onChange={setDescription}
            placeholder="Optional description"
            isTextArea
            rows={3}
            validate={createFieldValidator(MilestoneUpdatePayloadSchema.shape.description)}
            isDisabled={isPending}
          />
          <DatePicker
            label="Due Date"
            value={dueDate}
            onChange={(v) => v && setDueDate(v)}
            isDisabled={isPending || dueDateLocked}
            description={dueDateLockedDescription}
            validate={validateDueDate}
          />
          <TimeField
            label="Due Time"
            value={dueTime}
            onChange={(v) => v && setDueTime(new Time(v.hour, v.minute))}
            isDisabled={isPending || dueDateLocked}
            description={dueDateLockedDescription}
          />
          <Select
            label="Status"
            value={status}
            onChange={selectEnumHandler(CaseMilestoneStatus, setStatus)}
            isDisabled={isPending}
            description={statusDescription()}
            validate={validateStatus}
          >
            {milestoneStatusOptions(savedStatus).map((s) => (
              <SelectItem key={s} id={s}>
                {s}
              </SelectItem>
            ))}
          </Select>
          <div className={styles.actions}>
            <Button variant="secondary" type="button" onPress={handleCancel} isDisabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" isDisabled={isPending || !isDirty} isPending={isPending}>
              Save
            </Button>
          </div>
        </div>
      </Form>
    </Modal>
  );
}
