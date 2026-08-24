"use client";

import { CalendarDate } from "@internationalized/date";
import { useState } from "react";
import { Form } from "react-aria-components";
import { z } from "zod";

import { Button } from "@/components/ui/Button/Button";
import { DateField } from "@/components/ui/DateField/DateField";
import { Modal } from "@/components/ui/Modal/Modal";
import { Select, SelectItem } from "@/components/ui/Select/Select";
import { TextField } from "@/components/ui/TextField/TextField";
import { updateMilestoneAction } from "@/features/milestones/actions";
import type { MilestoneRow } from "@/features/milestones/queries";
import { MilestoneUpdatePayloadSchema } from "@/features/milestones/schemas";
import { CaseMilestoneStatus } from "@/generated/prisma/browser";
import { toCalendarDate } from "@/lib/date";
import {
  createFieldValidator,
  optionalString,
  requiredString,
  selectEnumHandler,
  toDateValue,
} from "@/lib/form-utils";
import { useModalForm } from "@/lib/useModalForm";

import styles from "./EditMilestoneModal.module.css";

const STATUS_OPTIONS = Object.values(CaseMilestoneStatus);

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
  const [status, setStatus] = useState<CaseMilestoneStatus>(
    milestone.status as CaseMilestoneStatus,
  );

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
      due_date: toDateValue(dueDate),
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
      <Form onSubmit={handleSave}>
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
          <DateField
            label="Due Date"
            value={dueDate}
            onChange={(v) => v && setDueDate(v)}
            isDisabled={isPending}
          />
          <Select
            label="Status"
            value={status}
            onChange={selectEnumHandler(CaseMilestoneStatus, setStatus)}
            isDisabled={isPending}
          >
            {STATUS_OPTIONS.map((s) => (
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
