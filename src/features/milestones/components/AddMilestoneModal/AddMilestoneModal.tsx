"use client";

import { CalendarDate, getLocalTimeZone, Time, today } from "@internationalized/date";
import { useState } from "react";
import { Form } from "react-aria-components";
import { z } from "zod";

import { Button } from "@/components/ui/Button/Button";
import { DatePicker } from "@/components/ui/DatePicker/DatePicker";
import { Modal } from "@/components/ui/Modal/Modal";
import { TextField } from "@/components/ui/TextField/TextField";
import { TimeField } from "@/components/ui/TimeField/TimeField";
import { createMilestoneAction } from "@/features/milestones/actions";
import { MilestoneCreatePayloadSchema } from "@/features/milestones/schemas";
import { CaseMilestoneStatus } from "@/generated/prisma/browser";
import { combineDateTime, isBeforeToday } from "@/lib/date";
import { createFieldValidator, optionalString, requiredString } from "@/lib/form-utils";
import { useModalForm } from "@/lib/useModalForm";

import styles from "./AddMilestoneModal.module.css";

interface AddMilestoneModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void;
  caseId: string;
}

export function AddMilestoneModal({
  isOpen,
  onOpenChange,
  onSuccess,
  caseId,
}: AddMilestoneModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<CalendarDate>(today(getLocalTimeZone()));
  const [dueTime, setDueTime] = useState<Time>(new Time(9, 0));

  function validateDueDate(): string | null {
    if (isBeforeToday(combineDateTime(dueDate, dueTime))) {
      return "Due date cannot be in the past";
    }
    return null;
  }

  const { isPending, submitForm, handleCancel } = useModalForm<
    z.input<typeof MilestoneCreatePayloadSchema>
  >({
    submit: createMilestoneAction,
    onOpenChange,
    onSuccess,
    successMessage: "Milestone added",
    successDescription: "The milestone has been added.",
    failureMessage: "Failed to add milestone",
    schema: MilestoneCreatePayloadSchema,
    reset: () => {
      setTitle("");
      setDescription("");
      setDueDate(today(getLocalTimeZone()));
      setDueTime(new Time(9, 0));
    },
  });

  async function handleSubmit(event: React.SyntheticEvent) {
    event.preventDefault();
    if (isPending) return;

    await submitForm({
      title: requiredString(title),
      description: optionalString(description),
      due_date: combineDateTime(dueDate, dueTime),
      status: CaseMilestoneStatus.Pending,
      case_id: caseId,
    });
  }

  return (
    <Modal
      title="Add Milestone"
      isOpen={isOpen}
      onOpenChange={handleCancel}
      className={styles.modal}
    >
      <Form validationBehavior="native" onSubmit={handleSubmit}>
        <div className={styles.content}>
          <TextField
            label="Title"
            value={title}
            onChange={setTitle}
            placeholder="Milestone title"
            validate={createFieldValidator(MilestoneCreatePayloadSchema.shape.title)}
            isDisabled={isPending}
          />
          <TextField
            label="Description"
            value={description}
            onChange={setDescription}
            placeholder="Optional description"
            isTextArea
            rows={3}
            validate={createFieldValidator(MilestoneCreatePayloadSchema.shape.description)}
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
          <div className={styles.actions}>
            <Button variant="secondary" type="button" onPress={handleCancel} isDisabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" isDisabled={isPending} isPending={isPending}>
              Save Milestone
            </Button>
          </div>
        </div>
      </Form>
    </Modal>
  );
}
