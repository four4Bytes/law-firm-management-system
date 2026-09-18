"use client";

import { CalendarDate, Time } from "@internationalized/date";
import { useState } from "react";
import { Form } from "react-aria-components";
import { z } from "zod";

import { Button } from "@/components/ui/Button/Button";
import { DatePicker } from "@/components/ui/DatePicker/DatePicker";
import { Modal } from "@/components/ui/Modal/Modal";
import { Select, SelectItem } from "@/components/ui/Select/Select";
import { TextField } from "@/components/ui/TextField/TextField";
import { TimeField } from "@/components/ui/TimeField/TimeField";
import { updateMilestoneAction } from "@/features/milestones/actions";
import type { MilestoneRow } from "@/features/milestones/queries";
import { MilestoneUpdatePayloadSchema } from "@/features/milestones/schemas";
import { milestoneStatusOptions } from "@/features/milestones/status";
import { CaseMilestoneStatus } from "@/generated/prisma/browser";
import {
  combineDateTime,
  isAfterToday,
  isBeforeToday,
  toCalendarDate,
  toTimeValue,
} from "@/lib/date";
import {
  createFieldValidator,
  optionalString,
  requiredString,
  selectEnumHandler,
} from "@/lib/form-utils";
import { useModalForm } from "@/lib/useModalForm";

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
  const newDueDate = combineDateTime(dueDate, dueTime);
  const dueDateChanged = newDueDate.getTime() !== milestone.due_date.getTime();
  const statusChanged = status !== milestone.status;

  function validateDueDate(): string | null {
    if (!dueDateChanged && !statusChanged) return null;
    if (status === CaseMilestoneStatus.Pending && isBeforeToday(newDueDate)) {
      return "Due date cannot be in the past";
    }
    if (status === CaseMilestoneStatus.Done && isAfterToday(newDueDate)) {
      return "Due date cannot be in the future";
    }
    return null;
  }

  const { isPending, submitForm, handleCancel } = useModalForm<
    z.input<typeof MilestoneUpdatePayloadSchema>
  >({
    submit: updateMilestoneAction,
    onOpenChange,
    onSuccess,
    successMessage: "Milestone updated",
    successDescription: "The milestone has been updated.",
    failureMessage: "Failed to update milestone",
    schema: MilestoneUpdatePayloadSchema,
  });

  async function handleSave(event: React.SyntheticEvent) {
    event.preventDefault();
    if (isPending) return;

    await submitForm({
      milestoneId: milestone.id,
      title: requiredString(title),
      description: optionalString(description),
      due_date: newDueDate,
      status,
    });
  }

  return (
    <Modal
      title="Edit Milestone"
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
            isDisabled={isPending}
            validate={validateDueDate}
          />
          <TimeField
            label="Due Time"
            value={dueTime}
            onChange={(v) => v && setDueTime(new Time(v.hour, v.minute))}
            isDisabled={isPending}
          />
          <Select
            label="Status"
            value={status}
            onChange={selectEnumHandler(CaseMilestoneStatus, setStatus)}
            isDisabled={isPending}
            description={
              milestone.status === CaseMilestoneStatus.Pending
                ? undefined
                : "Selecting Pending reopens this milestone and restarts its reminders."
            }
          >
            {milestoneStatusOptions(milestone.status as CaseMilestoneStatus).map((s) => (
              <SelectItem key={s} id={s}>
                {s}
              </SelectItem>
            ))}
          </Select>
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
