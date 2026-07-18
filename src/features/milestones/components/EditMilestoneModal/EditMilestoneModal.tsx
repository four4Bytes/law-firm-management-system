"use client";

import { CalendarDate } from "@internationalized/date";
import { useState } from "react";
import { Form } from "react-aria-components";
import { z } from "zod";

import { Button } from "@/components/ui/Button/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog/ConfirmDialog";
import { DateField } from "@/components/ui/DateField/DateField";
import { Modal } from "@/components/ui/Modal/Modal";
import { ProgressCircle } from "@/components/ui/ProgressCircle/ProgressCircle";
import { Select, SelectItem } from "@/components/ui/Select/Select";
import { TextField } from "@/components/ui/TextField/TextField";
import { queue } from "@/components/ui/Toast/Toast";
import { deleteMilestoneAction, updateMilestoneAction } from "@/features/milestones/actions";
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

  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { isPending, submitForm } = useModalForm<z.input<typeof MilestoneUpdatePayloadSchema>>({
    submit: updateMilestoneAction,
    onOpenChange,
    onSuccess,
    successMessage: "Milestone updated",
    failureMessage: "Failed to update milestone",
    schema: MilestoneUpdatePayloadSchema,
  });

  function handleDismiss() {
    if (isPending || isDeleting) return;
    onOpenChange(false);
  }

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

  async function handleDelete() {
    setIsDeleting(true);

    try {
      const result = await deleteMilestoneAction({ milestoneId: milestone.id });

      setShowDeleteConfirm(false);

      if (result.success) {
        queue.add({ title: "Milestone deleted" }, { timeout: 5000 });
        onOpenChange(false);
        onSuccess();
      } else {
        queue.add({ title: result.error ?? "Failed to delete milestone" }, { timeout: 5000 });
      }
    } catch {
      queue.add({ title: "Failed to delete milestone. Please try again." }, { timeout: 5000 });
    } finally {
      setIsDeleting(false);
    }
  }

  const hasChanges =
    title.trim() !== milestone.title ||
    description.trim() !== (milestone.description ?? "") ||
    dueDate.compare(toCalendarDate(milestone.due_date)) !== 0 ||
    status !== (milestone.status as CaseMilestoneStatus);

  return (
    <>
      <Modal
        title="Edit Milestone"
        isOpen={isOpen}
        onOpenChange={handleDismiss}
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
              isDisabled={isPending || isDeleting}
            />
            <TextField
              label="Description"
              value={description}
              onChange={setDescription}
              placeholder="Optional description"
              isTextArea
              rows={3}
              validate={createFieldValidator(MilestoneUpdatePayloadSchema.shape.description)}
              isDisabled={isPending || isDeleting}
            />
            <DateField
              label="Due Date"
              value={dueDate}
              onChange={(v) => v && setDueDate(v)}
              isDisabled={isPending || isDeleting}
            />
            <Select
              label="Status"
              value={status}
              onChange={selectEnumHandler(CaseMilestoneStatus, setStatus)}
              isDisabled={isPending || isDeleting}
            >
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} id={s}>
                  {s}
                </SelectItem>
              ))}
            </Select>
            <div className={styles.actions}>
              <Button
                variant="secondary"
                type="submit"
                isDisabled={!hasChanges || isPending || isDeleting}
                isPending={isPending}
              >
                Save
              </Button>
              <Button
                onPress={() => setShowDeleteConfirm(true)}
                isDisabled={isPending || isDeleting}
              >
                {isDeleting ? <ProgressCircle aria-label="Deleting" /> : "Delete"}
              </Button>
            </div>
          </div>
        </Form>
      </Modal>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Milestone"
        confirmLabel="Delete"
        onConfirm={handleDelete}
      >
        Are you sure you want to delete this milestone? This action cannot be undone.
      </ConfirmDialog>
    </>
  );
}
